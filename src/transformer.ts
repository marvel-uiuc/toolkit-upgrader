import { unified } from "unified";
import rehypeParse from "rehype-parse";
import rehypeStringify from "rehype-stringify";
import { visit } from "unist-util-visit";
import { classesToAttributes } from "./classes-to-attributes.ts";
import { elementConvert } from "./element-convert.ts";
import { Element, Root } from "hast";
import { components } from "./components.ts";
import is from "@sindresorhus/is";
import { classReplacements } from "./class-replacements.ts";
import { clone, contains, difference, remove, uniq } from "rambdax";
import { attributeRenames } from "./attribute-renames.ts";
import { select, selectAll } from "hast-util-select";
import { h } from "hastscript";
import { Note, Result } from "./Result.ts";

/**
 * Transform uses of v2 toolkit components to v3.
 *
 * @param input HTML code with v2 components
 */
export function transform(input: string): {result: string, notes: Note[]} {
    /**
     * Track which lines have modifications.
     *
     * We'll only replace those lines to minimize unwanted side effects.
     */
    let replaceLines: (number | undefined)[] = [];
    let results: Result[] = [];
    let twigMode = false;

    if (
        (input.includes("{{") && input.includes("}}")) ||
        (input.includes("{%") && input.includes("%}"))
    ) {
        let result = new Result()
        result.addNote("This looks like a Twig template, the Upgrader may sometimes break template syntax.");
        results.push(result);
        twigMode = true;
    }

    let lines = input.split("\n");
    const tree = unified().use(rehypeParse, { fragment: true }).parse(input);

    visit(tree, (node) => {
        if (node.type === "element") {
            const convert = elementConvert.find(
                (it) =>
                    (!it.tagName || it.tagName === node.tagName) &&
                    (!it.className ||
                        (is.array(node.properties.className, is.string) &&
                            node.properties.className.includes(
                                it.className,
                            ))) &&
                    (!it.hasAttribute ||
                        node.properties[it.hasAttribute] ||
                        node.properties[it.hasAttribute] === ""),
            );
            if (convert || node.tagName.startsWith("il-")) {
                let tagName = node.tagName.replace(/^il-/, "ilw-");

                // If there's a special convert rule, use that
                if (convert) {
                    tagName = convert.component;
                    if (
                        convert.removeAttribute &&
                        (node.properties[convert.removeAttribute] ||
                            node.properties[convert.removeAttribute] === "")
                    ) {
                        delete node.properties[convert.removeAttribute];
                    }
                    if (convert.attributes) {
                        for (let attr of convert.attributes) {
                            node.properties[attr.name] = attr.value;
                        }
                    }
                    if (
                        convert.className &&
                        is.array(node.properties.className, is.string)
                    ) {
                        node.properties.className.splice(
                            node.properties.className.indexOf(
                                convert.className,
                            ),
                            1,
                        );
                        replaceLines.push(node.position?.end.line);
                    }
                    // Only replace the start tag, the end tag will be replaced
                    // later. This is to help minimize any unwanted changes to
                    // broke HTML (eg. template files).
                    replaceLines.push(node.position?.start.line);
                }

                if (processClasses(node)) {
                    replaceLines.push(node.position?.start.line);
                }

                if (processAttributeRenames(node)) {
                    replaceLines.push(node.position?.start.line);
                }

                // Lastly, run special functions for additional conversions with
                // certain components.
                if (components[tagName]) {
                    let result = components[tagName](node);
                    results.push(result);
                    if (result.tagName) {
                        tagName = result.tagName;
                    }
                }

                node.tagName = tagName;
            } else {
                // Even if it's not an il- element, there may be classes we
                // need to replace.
                const className = node.properties.className;
                if (is.array(className, is.string)) {
                    for (let cn of classReplacements) {
                        let index = className.indexOf(cn.className);
                        if (index > -1) {
                            console.log(cn);
                            className[index] = cn.replacement;
                            replaceLines.push(node.position?.start.line);
                        }
                    }
                }
            }
        }
    });


    fixButtonGroups(tree);
    console.log("prefix", tree);

    // Get the processed HTML as an array of lines
    let converted = unified()
        .use(rehypeStringify, {
            allowDangerousCharacters: true,
            allowDangerousHtml: true,
            allowParseErrors: true,
            characterReferences: {
                omitOptionalSemicolons: true,
            },
        })
        .stringify(tree)
        .split("\n");

    console.log("postfix", converted);

    replaceLines = replaceLines.concat(results.flatMap((it) => it.lines));

    // Only replace the lines we processed
    for (let line of uniq(replaceLines).filter((it) => is.number(it))) {
        lines[line - 1] = converted[line - 1];
    }

    let result: string;
    if (twigMode) {
        result = lines.join("\n");
    } else {
        result = converted.join("\n");
    }

    if (twigMode) {
        // Lastly, replace tag names in lines we didn't fully process, which
        // includes most closing tags as well.
        for (let it of elementConvert) {
            if (it.tagName?.startsWith("il-")) {
                result = result.replace(
                    new RegExp(`<(/?)${it.tagName}(?=\\W)`, "g"),
                    `<$1${it.component}`,
                );
            }
        }
    }
    result = result.replace(/<(\/?)il-/g, "<$1ilw-");


    return {
        result,
        notes: results.flatMap(it => it.notes)
    };
}

/**
 * Convert classes to attributes when needed.
 *
 * @param node The toolkit component node
 */
function processClasses(node: Element) {
    let className = clone(node.properties["className"]);
    let modified = false;

    if (is.array(className, is.string)) {
        let names = className;
        for (let it of classesToAttributes) {
            if (Array.isArray(it.class)) {
                let diff = difference(names, it.class);
                if (names.length - diff.length === it.class.length) {
                    names = diff;
                    node.properties[it.attribute] = it.value;
                    modified = true;
                }
            } else {
                if (names.includes(it.class)) {
                    names = difference(names, [it.class]);
                    node.properties[it.attribute] = it.value;
                    modified = true;
                }
            }
        }
        if (names.length > 0) {
            node.properties["className"] = names;
        } else {
            delete node.properties["className"];
        }
    }
    return modified;
}

function processAttributeRenames(node: Element) {
    let modified = false;
    for (let [key, val] of Object.entries(node.properties)) {
        let rename = attributeRenames.find(
            (it) => it.element === node.tagName && it.attribute === key,
        );
        if (rename) {
            node.properties[rename.rename] = val;
            delete node.properties[key];
            modified = true;
        }
    }

    return modified;
}

function fixButtonGroups(tree: Root): (number | undefined)[] {
    let containers = selectAll(":not(li):has(> .ilw-button)", tree);
    let lines = [];

    for (let container of containers) {
        let buttons: Element[] = [];
        for (let child of container.children) {
            if (child.type === "element") {
                let className = child.properties?.className;
                if (
                    is.array(className, is.string) &&
                    className.includes("ilw-button")
                ) {
                    buttons.push(child);
                } else {
                    buttons = [];
                    break;
                }
            } else if (child.type !== "text" || !/^(\s|\\n)*$/.test(child.value)) {
                buttons = [];
                break;
            }
        }
        if (buttons.length > 1) {
            container.tagName = "ul";
            container.properties.className = ["ilw-buttons"];
            container.children = buttons.map((it) => {
                lines.push(it.position?.start?.line, it.position?.end?.line);
                return h("li", it);
            });
            lines.push(
                container.position?.start?.line,
                container.position?.end?.line,
            );
        }
    }
    return lines;
}
