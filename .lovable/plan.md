
## Changes

### 1. CTA Bank — Add description for each category
The `FORMULA_OBJECTIVES` already has a `description` field (e.g., "Ampliar alcance e reconhecimento"). The CTA Bank just doesn't display it. We'll add it next to the label inside the AccordionTrigger, matching the HookBank pattern:

```
<span className="text-[10px] text-muted-foreground hidden sm:inline">{obj.description}</span>
```

### 2. Hashtag Strategy — Remove numbering and match style
Currently the HashtagStrategy uses a `Card` component with "14. Estrategia de Hashtags" as title. We'll:

- Remove the "14." prefix from the title
- Replace the `Card`/`CardHeader`/`CardContent` wrapper with the `card-flat` div pattern used by the other tactical banks (CTABank, HookBank, etc.)
- Keep the same internal layout (categories, inputs, tags) but wrap it in the consistent bank style with icon + title + badge header

### Technical Details

**File: `src/components/brand-context/CTABank.tsx`**
- In the `AccordionTrigger`, add `obj.description` as a secondary text span (same styling as HookBank's `frame.description`)

**File: `src/components/brand-context/HashtagStrategy.tsx`**
- Replace `Card`/`CardHeader`/`CardContent` with `div className="card-flat p-5 space-y-4"`
- Remove "14." from the title
- Use the same header pattern as the other banks (icon + title + badge + button)
- Keep all functionality (inputs, tags, AI generation, dialog) intact
