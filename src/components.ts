import { Element } from "hast";
import { h } from "hastscript";
import { matches, select, selectAll } from "hast-util-select";

export const components: Record<string, (el: Element) => void> = {
    "ilw-card"(el) {
        let img = select("ilw-card img", el);
        if (img) {
            img.properties["slot"] = "image";
        }

        let heading = select("[slot=header]", el);
        if (heading) {
            delete heading.properties["slot"];

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
    },
};
