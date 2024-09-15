import { unified } from "unified";
import rehypeParse from "rehype-parse";
import rehypeStringify from "rehype-stringify";
import { visit } from "unist-util-visit";
import { classesToAttributes } from "./classes-to-attributes.ts";
import { elementConvert } from "./element-convert.ts";
import { Element } from "hast";
import { components } from "./components.ts";
import is from "@sindresorhus/is";
import { classReplacements } from "./class-replacements.ts";
import { clone, contains, difference, remove, uniq } from "rambdax";
import { attributeRenames } from "./attribute-renames.ts";

/**
 * Transform uses of v2 toolkit components to v3.
 *
 * @param input HTML code with v2 components
 */
export function transform(input: string): string {
    /**
     * Track which lines have modifications.
     *
     * We'll only replace those lines to minimize unwanted side effects.
     */
    let replaceLines: (number | undefined)[] = [];

    let lines = input.split("\n");
    const tree = unified().use(rehypeParse, { fragment: true }).parse(input);

    visit(tree, (node) => {
        if (node.type === "element") {
            if (node.tagName.startsWith("il-")) {
                let tagName = node.tagName.replace(/^il-/, "ilw-");
                const convert = elementConvert.find(
                    (it) =>
                        it.tagName === node.tagName &&
                        (!it.hasAttribute ||
                            node.properties[it.hasAttribute] ||
                            node.properties[it.hasAttribute] === ""),
                );

                // If there's a special convert rule, use that
                if (convert) {
                    tagName = convert.component;
                    if (
                        convert.removeAttribute &&
                        (node.properties[convert.removeAttribute] || node.properties[convert.removeAttribute] === '')
                    ) {
                        delete node.properties[convert.removeAttribute];
                    }
                    if (convert.attributes) {
                        for (let attr of convert.attributes) {
                            node.properties[attr.name] = attr.value;
                        }
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
                    let lines = components[tagName](node);
                    replaceLines.push(...lines);
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
                            className[index] = cn.replacement;
                            replaceLines.push(node.position?.start.line);
                        }
                    }
                }
            }
        }
    });

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

    // Only replace the lines we processed
    for (let line of uniq(replaceLines).filter((it) => is.number(it))) {
        lines[line - 1] = converted[line - 1];
    }

    let result = lines.join("\n");

    // Lastly, replace tag names in lines we didn't fully process, which
    // includes most closing tags as well.
    for (let it of elementConvert) {
        console.log(`<(/?)${it.tagName}(\\W)`, `<$1${it.component}$2`);
        result = result.replace(
            new RegExp(`<(/?)${it.tagName}(?=\\W)`, "g"),
            `<$1${it.component}`,
        );
    }
    result = result.replace(/<(\/?)il-/g, "<$1ilw-");

    return result;
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
