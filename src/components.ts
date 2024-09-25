import { Element, ElementContent } from "hast";
import { h } from "hastscript";
import { matches, select, selectAll } from "hast-util-select";
import { difference, filter, range, reverse } from "rambdax";
import is from "@sindresorhus/is";
import { toText } from "hast-util-to-text";
import { Result } from "./Result.ts";
import { UrlItem } from "./UrlItem.ts";

export const components: Record<string, (el: Element) => Result> = {
    "ilw-card"(el) {
        let result = new Result();
        let img = select("img", el);
        if (img) {
            img.properties["slot"] = "image";
            result.addStartEnd(img.position);
        }

        let heading = select("[slot=header]", el);
        if (heading) {
            delete heading.properties["slot"];
            result.addStartEnd(heading.position);

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
        return result;
    },
    "ilw-accordion"(el) {
        let result = new Result();

        let slotted = selectAll("[slot=header]", el);
        for (let it of slotted) {
            it.properties["slot"] = "summary";
            result.addStart(it.position);
        }

        return result;
    },
    "ilw-section-nav"(el) {
        let result = new Result();

        let heading = el.children.find((it) => it.type === "element");
        if (heading && /^h\d$/.test(heading.tagName)) {
            result.addLines(heading.position);
            let index = el.children.indexOf(heading);
            el.children.splice(index, 1);
            let ul = select("ul", el);
            if (ul) {
                result.addStart(ul.position);
                heading.tagName = "li";
                let a = select("a", heading);
                if (a) {
                    addClass(a, "ilw-section-nav--root");
                }
                ul.children.unshift(heading);
            }
        }

        return result;
    },
    "ilw-icon"(el) {
        let result = new Result();
        el.properties["icon"] = toText(el);
        el.children = [];

        result.addStart(el.position);

        return result;
    },
    "ilw-content"(el) {
        let result = new Result();

        if (el.properties.mode === "introduction") {
            let heading = select("[slot=heading]", el);
            if (heading) {
                heading.properties.slot = null;
                heading.children = [h("em", heading.children)];
                result.addStartEnd(heading.position);
            }
        }

        result.addStartEnd(el.position);

        return result;
    },
    "ilw-quote"(el) {
        let result = new Result();
        let attributed = select("[slot=attributed]", el);
        let secondary = select("[slot=secondary]", el);
        if (attributed) {
            attributed.properties.slot = "author";
            delete attributed.position;
        }
        if (secondary) {
            secondary.properties.slot = "source";
        }
        let content = el.children.filter(
            (it) => it.type !== "element" || !it.properties.slot,
        );
        el.children = [
            h("p", { slot: "content" }, content),
            ...[attributed, secondary].filter((it) => !!it),
        ];

        result.addLines(el.position);
        return result;
    },
    "ilw-statistic"(el) {
        let result = new Result();

        let stat = select("em[slot=stat]", el);
        if (stat) {
            stat.tagName = "span";
            result.addStartEnd(stat.position);
        }

        return result;
    },
    "ilw-tabs"(el) {
        let result = new Result();

        let buttons: ElementContent[] = [];
        let panels: Element[] = [];
        let headingIndex = -1;

        let index = 0;
        for (let it of el.children) {
            if (it.type === "element") {
                if (it.properties.slot === "title") {
                    headingIndex = index;
                } else if (it.tagName === "il-vertical-tab-panel") {
                    panels.push(it);
                }
            }

            ++index;
        }

        if (headingIndex !== -1) {
            let heading = el.children.splice(headingIndex, 1)[0];
            if (heading.type === "element") {
                delete heading.properties.slot;
                result.insert = heading;
            }
        }

        panels.map((it, index) => {
            let header = select("[slot=header]", it);
            let text: string;
            if (header) {
                text = toText(header);
            } else {
                text = "Tab #" + (index + 1);
                result.addNote(
                    "il-vertical-tab-panel was missing a header",
                    it.position?.start.line,
                );
            }
            let id =
                "ilw-tab-id-" + text.replace(/[^A-Za-z0-9]/g, "").toLowerCase();
            buttons.push(
                h("button", { role: "tab", "aria-controls": id }, [text]),
            );
            it.tagName = "div";
            it.properties.id = id;
        });

        el.children.unshift(h("div", { slot: "tabs" }, ...buttons));

        result.addLines(el.position);

        return result;
    },
    "ilw-video"(el) {
        let result = new Result();

        let src = el.properties.src as string;
        let title = el.properties.title;
        delete el.properties.src;
        delete el.properties.title;

        let url = new UrlItem(src);

        el.children = [
            h("iframe", {
                src: url.videoUrl,
                id:`${url.videoType}_player_${url.videoId}`,
                title: title + " (video)",
                style: "position: absolute; top: 0; left: 0; width: 100%; height: 100%",
                allowfullscreen: "",
                allow: "autoplay *; fullscreen *; encrypted-media *",
                frameborder: "0",
                referrerpolicy: "no-referrer-when-downgrade",
                sandbox:
                    "allow-downloads allow-forms allow-same-origin allow-scripts allow-top-navigation allow-pointer-lock allow-popups allow-modals allow-orientation-lock allow-popups-to-escape-sandbox allow-presentation allow-top-navigation-by-user-activation",
            }),
        ];

        result.addLines(el.position);

        return result;
    },
    "ilw-image-feature"(el) {
        let result = new Result();

        if (!el.properties.theme) {
            el.properties.theme = "blue-gradient";
        }
        el.properties.padding = "0";
        el.properties.gap = "40px";

        let img = select("[slot=image]", el)!;
        delete img.properties.slot;
        let children = difference(el.children, [img]);

        el.children = [
            h("div", [
                h("div", {class: "ilw-image-cover"}, [img])
            ]),
            h("ilw-content", {mode: "inset", theme: el.properties.theme}, children)
        ];

        if (el.properties.align === "right") {
            el.children = reverse(el.children);
        }
        delete el.properties.align;

        result.addLines(el.position);
        result.tagName = "ilw-columns";

        return result;
    },
    "ilw-video-feature"(el) {
        let result = new Result();

        if (!el.properties.theme) {
            el.properties.theme = "blue-gradient";
        }
        el.properties.padding = "0";
        el.properties.gap = "40px";
        let video = h("ilw-video", {src: el.properties.src});
        delete el.properties.src;

        components["ilw-video"](video);

        let children = el.children

        el.children = [
            h("div", {style: "position: relative"}, [
                video
            ]),
            h("ilw-content", {mode: "inset", theme: el.properties.theme}, children)
        ];

        if (el.properties.align === "right") {
            el.children = reverse(el.children);
        }
        delete el.properties.align;

        result.addLines(el.position);
        result.tagName = "ilw-columns";

        return result;
    },
    "ilw-gallery"(el) {
        let result = new Result();

        result.addNote("il-gallery is no longer supported", el.position?.start.line);

        return result;
    },
    "ilw-gallery-detail"(el) {
        let result = new Result();

        result.addNote("il-gallery-detail is no longer supported", el.position?.start.line);

        return result;
    },
    "ilw-profile-card"(el) {
        let result = new Result();

        result.addNote("ilw-profile-card has not been implemented yet", el.position?.start.line);

        return result;
    },
    "ilw-hero"(el) {
        let result = new Result();

        let ul = select("ul:has(li > a)", el);
        if (ul) {
            ul.properties.className = ["ilw-buttons"];
            result.addStart(ul.position);
        }

        return result;
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
