import type { QuoteLineItem } from "./types";

// Keyword-matched default checklists. When a quote becomes a job, each line
// item expands into the actual sequence of work a crew member checks off and
// clocks time against — a "paint a room" line item isn't one task, it's
// prep, patch, prime, two coats, and cleanup. Falls back to a single task
// named after the line item when nothing matches.
interface TemplateRule {
  test: RegExp;
  tasks: string[];
}

const RULES: TemplateRule[] = [
  {
    test: /paint/i,
    tasks: ["Prep & protect surfaces", "Patch and sand", "Prime", "Paint - coat 1", "Paint - coat 2", "Clean up"],
  },
  {
    test: /(baseboard|trim|molding|moulding)/i,
    tasks: [
      "Remove old trim",
      "Fill nail holes & caulk gaps",
      "Install new trim",
      "Caulk & touch up",
      "Paint/finish trim",
    ],
  },
  {
    test: /cabinet/i,
    tasks: ["Remove old cabinets", "Install cabinet boxes", "Install doors & hardware", "Final adjustment & cleanup"],
  },
  {
    test: /(floor|flooring)/i,
    tasks: ["Remove old flooring", "Prep subfloor", "Install flooring", "Install transitions/trim"],
  },
  {
    test: /(panel|breaker|wiring|electrical|outlet)/i,
    tasks: ["Shut off power & prep", "Rough-in wiring", "Install fixtures/devices", "Test & inspect"],
  },
  {
    test: /(deck|framing)/i,
    tasks: ["Demo existing structure", "Frame/build", "Install decking/railing", "Final inspection & cleanup"],
  },
  {
    test: /drywall/i,
    tasks: ["Hang drywall", "Tape & mud - coat 1", "Tape & mud - coat 2", "Sand", "Prime"],
  },
];

export function suggestTasksForLineItem(item: QuoteLineItem): string[] {
  for (const rule of RULES) {
    if (rule.test.test(item.name) || rule.test.test(item.category)) return rule.tasks;
  }
  return [item.name];
}
