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
    }
];
