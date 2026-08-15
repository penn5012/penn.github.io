# Lanhu design review and handoff

## Decision

Lanhu is the project's review, annotation, asset and developer-handoff surface. Figma is not part of the workflow.

The supplied `lanhumcp.com` site targets conversion of existing design files into Unity UGUI prefabs. It is not a web UI authoring canvas and is out of scope for this React product. The web project should use the standard Lanhu collaboration workflow; the design authoring source must produce web-oriented screens that can be uploaded to Lanhu.

## Required review structure

Keep the following sections in the Lanhu project or its screen grouping:

1. Product brief and user flows.
2. Design foundations and reusable components.
3. Responsive screens and developer handoff.

## Required screen states

For each product flow include, where applicable:

- default and populated state;
- loading and streaming state;
- empty state;
- validation and server error state;
- disabled and destructive confirmation state;
- desktop, tablet and mobile-web behavior.

## Responsive baseline

| Target | Reference width | Intent |
| --- | ---: | --- |
| Desktop | 1440 px | Full navigation and conversation workspace |
| Tablet | 768 px | Collapsible navigation and touch-friendly controls |
| Mobile web | 390 px | Single-column flow with navigation drawer |

These are review references, not hard-coded device assumptions. Implementation must remain fluid between breakpoints.

## Handoff checklist

- Page and state names match the PRD.
- Components use consistent names and states.
- Spacing, color, typography and radius values are documented.
- Icons and raster assets are exportable at the required resolution.
- Interaction notes cover focus, keyboard, hover, touch and reduced motion.
- API-dependent states reference `docs/api/openapi.yaml`.
