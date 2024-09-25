export const elementConvert = [
    {
        tagName: "il-clickable-card",
        component: "ilw-card",
        attributes: [
            {
                name: "clickable",
                value: true,
            },
        ],
    },
    {
        tagName: "il-section-nav",
        component: "ilw-section-nav",
        attributes: [
            {
                name: "mode",
                value: "manual"
            }
        ]
    },
    {
        tagName: "il-breadcrumbs-page",
        hasAttribute: "current",
        component: "span",
        removeAttribute: "current"
    },
    {
        tagName: "il-breadcrumbs-page",
        component: "a",
    },
    {
        tagName: "div",
        className: "il-formatted",
        component: "ilw-content"
    },
    {
        className: "il-icon",
        component: "ilw-icon"
    },
    {
        className: "il-icon-line",
        component: "ilw-icon",
        attributes: [
            {
                name: "type",
                value: "line"
            }
        ]
    },
    {
        tagName: "il-introduction",
        component: "ilw-content",
        attributes: [
            {
                name: "mode",
                value: "introduction"
            }
        ]
    },
    {
        tagName: "il-lede",
        component: "ilw-content",
        attributes: [
            {
                name: "mode",
                value: "lede"
            }
        ]
    },
    {
        tagName: "il-vertical-tab",
        component: "ilw-tabs"
    }
];
