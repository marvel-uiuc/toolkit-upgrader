import { Element } from "hast";
import { h } from "hastscript";
import { matches, select, selectAll } from "hast-util-select";

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
};
