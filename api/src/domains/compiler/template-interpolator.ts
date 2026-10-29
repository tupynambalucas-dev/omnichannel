import type { AbstractUiComponent } from '@tupynambalucas-dev/omnichannel-core';

const VARIABLE_TOKEN_PATTERN = /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g;

function resolvePath(variables: Record<string, unknown>, pathExpression: string): string {
  const segments = pathExpression.split('.');
  let current: unknown = variables;

  for (const segment of segments) {
    if (current !== null && typeof current === 'object' && segment in current) {
      current = (current as Record<string, unknown>)[segment];
    } else {
      return '';
    }
  }

  if (current === null || current === undefined) {
    return '';
  }

  if (typeof current === 'string') {
    return current;
  }

  if (typeof current === 'number' || typeof current === 'boolean') {
    return String(current);
  }

  return JSON.stringify(current);
}

/**
 * Replaces `{{variableName}}` or `{{nested.field}}` placeholders against the session context.
 */
export function interpolateTemplate(template: string, variables: Record<string, unknown>): string {
  return template.replace(VARIABLE_TOKEN_PATTERN, (_match, key: string) =>
    resolvePath(variables, key),
  );
}

/**
 * Deeply interpolates text fields inside an abstract UI component before channel compilation.
 */
export function interpolateUiComponent(
  component: AbstractUiComponent,
  variables: Record<string, unknown>,
): AbstractUiComponent {
  switch (component.kind) {
    case 'TEXT':
      return {
        ...component,
        body: interpolateTemplate(component.body, variables),
      };

    case 'QUICK_CHOICES':
      return {
        ...component,
        headerText:
          component.headerText !== undefined
            ? interpolateTemplate(component.headerText, variables)
            : undefined,
        body: interpolateTemplate(component.body, variables),
        footerText:
          component.footerText !== undefined
            ? interpolateTemplate(component.footerText, variables)
            : undefined,
        options: component.options.map((opt) => ({
          ...opt,
          title: interpolateTemplate(opt.title, variables),
          description:
            opt.description !== undefined
              ? interpolateTemplate(opt.description, variables)
              : undefined,
        })),
      };

    case 'MENU_CHOICES':
      return {
        ...component,
        headerText:
          component.headerText !== undefined
            ? interpolateTemplate(component.headerText, variables)
            : undefined,
        body: interpolateTemplate(component.body, variables),
        footerText:
          component.footerText !== undefined
            ? interpolateTemplate(component.footerText, variables)
            : undefined,
        menuButtonLabel: interpolateTemplate(component.menuButtonLabel, variables),
        sectionTitle: interpolateTemplate(component.sectionTitle, variables),
        options: component.options.map((opt) => ({
          ...opt,
          title: interpolateTemplate(opt.title, variables),
          description:
            opt.description !== undefined
              ? interpolateTemplate(opt.description, variables)
              : undefined,
        })),
      };

    case 'CTA_URL':
      return {
        ...component,
        headerText:
          component.headerText !== undefined
            ? interpolateTemplate(component.headerText, variables)
            : undefined,
        body: interpolateTemplate(component.body, variables),
        footerText:
          component.footerText !== undefined
            ? interpolateTemplate(component.footerText, variables)
            : undefined,
        buttonLabel: interpolateTemplate(component.buttonLabel, variables),
        url: interpolateTemplate(component.url, variables),
      };

    case 'CAROUSEL_CARDS':
      return {
        ...component,
        introText:
          component.introText !== undefined
            ? interpolateTemplate(component.introText, variables)
            : undefined,
        cards: component.cards.map((card) => ({
          ...card,
          title: interpolateTemplate(card.title, variables),
          subtitle:
            card.subtitle !== undefined ? interpolateTemplate(card.subtitle, variables) : undefined,
          buttons: card.buttons.map((button) => ({
            ...button,
            title: interpolateTemplate(button.title, variables),
            payloadOrUrl: interpolateTemplate(button.payloadOrUrl, variables),
          })),
        })),
      };
  }
}
