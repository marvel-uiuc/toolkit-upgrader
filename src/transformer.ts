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
import { unique } from "remeda";

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
                    (it) => it.tagName === node.tagName,
                );

                // If there's a special convert rule, use that
                if (convert) {
                    tagName = convert.component;
                    node.tagName = convert.component;
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

                // Lastly, run special functions for additional conversions with
                // certain components.
                if (components[tagName]) {
                    let lines = components[tagName](node);
                    replaceLines.push(...lines);
                }
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
            }
        })
        .stringify(tree).split("\n");

    // Only replace the lines we processed
    for (let line of unique(replaceLines).filter(it => is.number(it))) {
        lines[line - 1] = converted[line - 1];
    }

    let result = lines.join("\n");

    // Lastly, replace tag names in lines we didn't fully process, which
    // includes most closing tags as well.
    for (let it of elementConvert) {
        console.log(`<(/?)${it.tagName}(\\W)`, `<$1${it.component}$2`);
        result = result.replace(new RegExp(`<(/?)${it.tagName}(?=\\W)`, "g"), `<$1${it.component}`);
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
    let className = node.properties["className"];
    let modified = false;

    if (is.array(className, is.string)) {
        let newClasses: string[] = [];
        for (let name of className) {
            let attr = classesToAttributes.find((it) => it["class"] === name);
            if (attr) {
                node.properties[attr.attribute] = attr.value;
                modified = true;
            } else {
                newClasses.push(name);
            }
        }
        if (newClasses.length > 0) {
            node.properties["className"] = newClasses;
        } else {
            delete node.properties["className"];
        }
    }
    return modified;
}
