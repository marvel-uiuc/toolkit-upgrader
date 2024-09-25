import { Position } from "unist";
import { range } from "rambdax";
import { Element } from "hast";

export interface Note {
    message: string;
    line?: number;
}

export class Result {
    lines: (number | undefined)[] = [];
    notes: Note[] = [];
    insert?: Element;
    tagName?: string;

    addNote(message: string, line?: number) {
        this.notes.push({
            message, line
        })
    }
    addStart(pos: Position | undefined) {
        if (pos) {
            this.lines.push(pos.start.line);
        }
    }
    addStartEnd(pos: Position | undefined) {
        if (pos) {
            this.lines.push(pos.start.line, pos.end.line);
        }
    }
    addLines(pos: Position | undefined) {
        if (pos) {
            this.lines.push(...range(pos.start.line, pos.end.line + 1));
        }
    }
}

export function resultForPosition(pos: Position | undefined) {
    let result = new Result();

}