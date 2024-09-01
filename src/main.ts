import "./style.css";
import { transform } from "./transformer.ts";

addEventListener("load", () => {
    const source = document.getElementById("source") as HTMLTextAreaElement;
    const result = document.getElementById("result") as HTMLTextAreaElement;

    try {
        const existing = localStorage.getItem("source");
        if (existing) {
            source.value = existing;
        }
    } catch (err) {
        console.warn(err);
    }


    source.addEventListener("input", () => {
        try {
            localStorage.setItem("source", source.value);
        } catch (err) {
            console.warn(err);
        }
    })

    document.getElementById("convert")?.addEventListener("click", () => {
        result.value = transform(source.value);
    });
});
