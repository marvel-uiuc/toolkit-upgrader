import { Element } from "hast";
import { h } from "hastscript";
import { matches, select, selectAll } from "hast-util-select";
import { range } from "rambdax";
import is from "@sindresorhus/is";

export const components: Record<string, (el: Element) => (number | undefined)[]> = {
    "ilw-card"(el) {
        let lines = [];
        let img = select("img", el);
        if (img) {
            img.properties["slot"] = "image";
            lines.push(img.position?.start.line, img.position?.end.line);
        }

        let heading = select("[slot=header]", el);
        if (heading) {
            delete heading.properties["slot"];
            lines.push(heading.position?.start.line, heading.position?.end.line);

            console.log(el);
            if (el.properties.href) {
                const href = el.properties.href as string;
                delete el.properties.href;

                const link = h(
                    "a",
                    {
                        href,
                    },
                    heading.children,
                );
                heading.children = [link];
            }
        }
        return lines;
    },
    "ilw-accordion"(el) {
        let lines = [];

        let slotted = selectAll("[slot=header]", el);
        for (let it of slotted) {
            it.properties["slot"] = "summary";
            lines.push(it.position?.start.line);
        }

        return lines;
    },
    "ilw-section-nav"(el) {
        let lines = [];

        let heading = el.children.find(it => it.type === "element");
        if (heading && /^h\d$/.test(heading.tagName)) {
            lines.push(...range(heading.position!.start.line, heading.position!.end.line + 1));
            let index = el.children.indexOf(heading);
            el.children.splice(index, 1);
            let ul = select("ul", el);
            if (ul) {
                lines.push(ul.position?.start.line);
                heading.tagName = "li";
                let a = select("a", heading);
                if (a) {
                    addClass(a, "ilw-section-nav--root");
                }
                ul.children.unshift(heading);
            }
        }

        return lines;
    }
};


function addClass(node: Element, ...classes: string[]) {
    let className = node.properties["className"];

    if (is.array(className, is.string)) {
        node.properties["className"] = className.concat(classes);
    } else {
        node.properties["className"] = classes;
    }
}