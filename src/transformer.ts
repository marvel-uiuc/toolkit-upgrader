import { rehype } from "rehype";
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

export function transform(input: string): string {
    const tree = unified().use(rehypeParse, { fragment: true }).parse(input);

    visit(tree, (node) => {
        if (node.type === "element") {
            if (node.tagName.startsWith("il-")) {
                console.log(node);
                const convert = elementConvert.find(
                    (it) => it.tagName === node.tagName,
                );
                if (convert) {
                    node.tagName = convert.component;
                    if (convert.attributes) {
                        for (let attr of convert.attributes) {
                            node.properties[attr.name] = attr.value;
                        }
                    }
                } else {
                    node.tagName = node.tagName.replace(/^il-/, "ilw-");
                }

                processClasses(node);
                if (components[node.tagName]) {
                    components[node.tagName](node);
                }
            } else {
                const className = node.properties.className;
                if (is.array(className, is.string)) {
                    for (let cn of classReplacements) {
                        let index = className.indexOf(cn.className);
                        if (index > -1) {
                            className[index] = cn.replacement;
                        }
                    }
                }
            }
        }
    });

    return unified()
        .use(rehypeStringify, {
            allowDangerousCharacters: true,
            allowDangerousHtml: true,
            allowParseErrors: true,
        })
        .stringify(tree);
}

function processClasses(node: Element) {
    let className = node.properties["className"];

    if (is.array(className, is.string)) {
        let newClasses: string[] = [];
        for (let name of className) {
            let attr = classesToAttributes.find((it) => it["class"] === name);
            if (attr) {
                node.properties[attr.attribute] = attr.value;
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
}
