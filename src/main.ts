import "./style.css";
import { transform } from "./transformer.ts";

addEventListener("load", () => {
    const source = document.getElementById("source") as HTMLTextAreaElement;
    const result = document.getElementById("result") as HTMLTextAreaElement;
    const notes = document.getElementById("notes") as HTMLDivElement;

    try {
        const existing = localStorage.getItem("source");
        if (existing) {
            source.value = existing;
        } else {
            source.value = `{% for card in some_template_variable %}
<il-card class="il-theme-blue-gradient">
<div class="il-icon">alumni</div>
<h3>Student Life</h3>
<p>Animal sciences students extend their learning and career networks beyond
the classroom through internships, judging teams, student organizations, undergraduate research
projects with our faculty, as well as short- and long-term study abroad opportunities all over the world. </p>
<p class="il-buttons"><a href="#" class="il-button">Learn More</a><a href="#" class="il-button">Contact Us</a></p>
</il-card>
{% endfor %}

<il-clickable-card href="https://www.example.com">
<img src="https://picsum.photos/1920/1280" alt="">
<h3 slot="header">Student Life</h3>
<p>Animal sciences students extend their learning and career networks beyond
the classroom through internships, judging teams, student organizations, undergraduate research
projects with our faculty, as well as short- and long-term study abroad opportunities all over the world. </p>
</il-clickable-card>`;
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
        let res = transform(source.value);
        console.log(res);

        result.value = res.result;

        let els = res.notes.map(it => {
            return `<div class="note"><span>Line ${it.line?.toString() || "-"}</span> <p>${it.message}</p></div>`;
        }).join("\n");

        console.log(els);
        notes.innerHTML = els;
    });
});
