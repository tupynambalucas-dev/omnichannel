import { INSTAGRAM_LIMITS, WHATSAPP_LIMITS } from '@tupynambalucas-dev/omnichannel-core';
import type {
  AbstractActionOption,
  AbstractUiComponent,
  OmnichannelChannel,
} from '@tupynambalucas-dev/omnichannel-core';
import { interpolateUiComponent } from './template-interpolator.js';

export interface CompiledProviderRequest {
  channel: OmnichannelChannel;
  endpointAccountId: string;
  body: Record<string, unknown>;
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, Math.max(1, maxLength - 1)).trimEnd() + '…';
}

function buildWhatsAppListPayload(
  recipientId: string,
  bodyText: string,
  options: AbstractActionOption[],
  headerText?: string,
  footerText?: string,
  buttonLabel = 'Options',
  sectionTitle = 'Available Options',
): Record<string, unknown> {
  const interactive: Record<string, unknown> = {
    type: 'list',
    body: { text: truncateText(bodyText, WHATSAPP_LIMITS.MAX_BODY_TEXT_LENGTH) },
    action: {
      button: truncateText(buttonLabel, WHATSAPP_LIMITS.MAX_LIST_BUTTON_LABEL_LENGTH),
      sections: [
        {
          title: truncateText(sectionTitle, WHATSAPP_LIMITS.MAX_LIST_ROW_TITLE_LENGTH),
          rows: options.slice(0, WHATSAPP_LIMITS.MAX_LIST_ROWS).map((opt) => ({
            id: opt.id,
            title: truncateText(opt.title, WHATSAPP_LIMITS.MAX_LIST_ROW_TITLE_LENGTH),
            ...(opt.description !== undefined
              ? {
                  description: truncateText(
                    opt.description,
                    WHATSAPP_LIMITS.MAX_LIST_ROW_DESCRIPTION_LENGTH,
                  ),
                }
              : {}),
          })),
        },
      ],
    },
  };

  if (headerText !== undefined && headerText.length > 0) {
    interactive.header = {
      type: 'text',
      text: truncateText(headerText, WHATSAPP_LIMITS.MAX_HEADER_TEXT_LENGTH),
    };
  }

  if (footerText !== undefined && footerText.length > 0) {
    interactive.footer = {
      text: truncateText(footerText, WHATSAPP_LIMITS.MAX_FOOTER_TEXT_LENGTH),
    };
  }

  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: recipientId,
    type: 'interactive',
    interactive,
  };
}

function compileComponentForWhatsApp(
  recipientId: string,
  component: AbstractUiComponent,
): Array<Record<string, unknown>> {
  switch (component.kind) {
    case 'TEXT':
      return [
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: recipientId,
          type: 'text',
          text: {
            preview_url: component.previewUrl,
            body: truncateText(component.body, WHATSAPP_LIMITS.MAX_BODY_TEXT_LENGTH),
          },
        },
      ];

    case 'QUICK_CHOICES': {
      // WhatsApp allows at most 3 reply buttons; automatically promote 4..10 options to an interactive list.
      if (component.options.length > WHATSAPP_LIMITS.MAX_REPLY_BUTTONS) {
        return [
          buildWhatsAppListPayload(
            recipientId,
            component.body,
            component.options,
            component.headerText,
            component.footerText,
          ),
        ];
      }

      const interactive: Record<string, unknown> = {
        type: 'button',
        body: { text: truncateText(component.body, WHATSAPP_LIMITS.MAX_BODY_TEXT_LENGTH) },
        action: {
          buttons: component.options.map((opt) => ({
            type: 'reply',
            reply: {
              id: opt.id,
              title: truncateText(opt.title, WHATSAPP_LIMITS.MAX_BUTTON_TITLE_LENGTH),
            },
          })),
        },
      };

      if (component.headerText !== undefined && component.headerText.length > 0) {
        interactive.header = {
          type: 'text',
          text: truncateText(component.headerText, WHATSAPP_LIMITS.MAX_HEADER_TEXT_LENGTH),
        };
      }

      if (component.footerText !== undefined && component.footerText.length > 0) {
        interactive.footer = {
          text: truncateText(component.footerText, WHATSAPP_LIMITS.MAX_FOOTER_TEXT_LENGTH),
        };
      }

      return [
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: recipientId,
          type: 'interactive',
          interactive,
        },
      ];
    }

    case 'MENU_CHOICES':
      return [
        buildWhatsAppListPayload(
          recipientId,
          component.body,
          component.options,
          component.headerText,
          component.footerText,
          component.menuButtonLabel,
          component.sectionTitle,
        ),
      ];

    case 'CTA_URL': {
      const interactive: Record<string, unknown> = {
        type: 'cta_url',
        body: { text: truncateText(component.body, WHATSAPP_LIMITS.MAX_BODY_TEXT_LENGTH) },
        action: {
          name: 'cta_url',
          parameters: {
            display_text: truncateText(
              component.buttonLabel,
              WHATSAPP_LIMITS.MAX_BUTTON_TITLE_LENGTH,
            ),
            url: component.url,
          },
        },
      };

      if (component.headerText !== undefined && component.headerText.length > 0) {
        interactive.header = {
          type: 'text',
          text: truncateText(component.headerText, WHATSAPP_LIMITS.MAX_HEADER_TEXT_LENGTH),
        };
      }

      if (component.footerText !== undefined && component.footerText.length > 0) {
        interactive.footer = {
          text: truncateText(component.footerText, WHATSAPP_LIMITS.MAX_FOOTER_TEXT_LENGTH),
        };
      }

      return [
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: recipientId,
          type: 'interactive',
          interactive,
        },
      ];
    }

    case 'CAROUSEL_CARDS': {
      const payloads: Array<Record<string, unknown>> = [];

      if (component.introText !== undefined && component.introText.length > 0) {
        payloads.push({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: recipientId,
          type: 'text',
          text: { body: truncateText(component.introText, WHATSAPP_LIMITS.MAX_BODY_TEXT_LENGTH) },
        });
      }

      for (const card of component.cards) {
        const postbackButtons = card.buttons.filter((b) => b.type === 'postback');
        const urlButton = card.buttons.find((b) => b.type === 'web_url');
        const cardBody =
          card.subtitle !== undefined && card.subtitle.length > 0
            ? `${card.title}\n${card.subtitle}`
            : card.title;

        if (postbackButtons.length > 0) {
          const interactive: Record<string, unknown> = {
            type: 'button',
            body: { text: truncateText(cardBody, WHATSAPP_LIMITS.MAX_BODY_TEXT_LENGTH) },
            action: {
              buttons: postbackButtons.slice(0, WHATSAPP_LIMITS.MAX_REPLY_BUTTONS).map((btn) => ({
                type: 'reply',
                reply: {
                  id: btn.payloadOrUrl,
                  title: truncateText(btn.title, WHATSAPP_LIMITS.MAX_BUTTON_TITLE_LENGTH),
                },
              })),
            },
          };

          if (card.imageUrl !== undefined) {
            interactive.header = {
              type: 'image',
              image: { link: card.imageUrl },
            };
          }

          payloads.push({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: recipientId,
            type: 'interactive',
            interactive,
          });
        } else if (urlButton !== undefined) {
          payloads.push({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: recipientId,
            type: 'interactive',
            interactive: {
              type: 'cta_url',
              body: { text: truncateText(cardBody, WHATSAPP_LIMITS.MAX_BODY_TEXT_LENGTH) },
              action: {
                name: 'cta_url',
                parameters: {
                  display_text: truncateText(
                    urlButton.title,
                    WHATSAPP_LIMITS.MAX_BUTTON_TITLE_LENGTH,
                  ),
                  url: urlButton.payloadOrUrl,
                },
              },
            },
          });
        }
      }

      return payloads;
    }
  }
}

function compileComponentForInstagram(
  recipientId: string,
  component: AbstractUiComponent,
): Array<Record<string, unknown>> {
  switch (component.kind) {
    case 'TEXT':
      return [
        {
          recipient: { id: recipientId },
          message: {
            text: truncateText(component.body, INSTAGRAM_LIMITS.MAX_TEXT_LENGTH),
          },
        },
      ];

    case 'QUICK_CHOICES':
    case 'MENU_CHOICES': {
      // Instagram has no native list drawer; both QUICK_CHOICES and MENU_CHOICES compile to quick_replies (max 13).
      return [
        {
          recipient: { id: recipientId },
          message: {
            text: truncateText(component.body, INSTAGRAM_LIMITS.MAX_TEXT_LENGTH),
            quick_replies: component.options
              .slice(0, INSTAGRAM_LIMITS.MAX_QUICK_REPLIES)
              .map((opt) => ({
                content_type: 'text',
                title: truncateText(opt.title, INSTAGRAM_LIMITS.MAX_QUICK_REPLY_TITLE_LENGTH),
                payload: truncateText(opt.id, INSTAGRAM_LIMITS.MAX_QUICK_REPLY_PAYLOAD_LENGTH),
              })),
          },
        },
      ];
    }

    case 'CTA_URL':
      return [
        {
          recipient: { id: recipientId },
          message: {
            attachment: {
              type: 'template',
              payload: {
                template_type: 'button',
                text: truncateText(component.body, INSTAGRAM_LIMITS.MAX_TEXT_LENGTH),
                buttons: [
                  {
                    type: 'web_url',
                    url: component.url,
                    title: truncateText(
                      component.buttonLabel,
                      WHATSAPP_LIMITS.MAX_BUTTON_TITLE_LENGTH,
                    ),
                  },
                ],
              },
            },
          },
        },
      ];

    case 'CAROUSEL_CARDS': {
      const payloads: Array<Record<string, unknown>> = [];

      if (component.introText !== undefined && component.introText.length > 0) {
        payloads.push({
          recipient: { id: recipientId },
          message: {
            text: truncateText(component.introText, INSTAGRAM_LIMITS.MAX_TEXT_LENGTH),
          },
        });
      }

      payloads.push({
        recipient: { id: recipientId },
        message: {
          attachment: {
            type: 'template',
            payload: {
              template_type: 'generic',
              elements: component.cards
                .slice(0, INSTAGRAM_LIMITS.MAX_CAROUSEL_ELEMENTS)
                .map((card) => ({
                  title: truncateText(card.title, INSTAGRAM_LIMITS.MAX_ELEMENT_TITLE_LENGTH),
                  ...(card.subtitle !== undefined
                    ? {
                        subtitle: truncateText(
                          card.subtitle,
                          INSTAGRAM_LIMITS.MAX_ELEMENT_SUBTITLE_LENGTH,
                        ),
                      }
                    : {}),
                  ...(card.imageUrl !== undefined ? { image_url: card.imageUrl } : {}),
                  buttons: card.buttons
                    .slice(0, INSTAGRAM_LIMITS.MAX_TEMPLATE_BUTTONS)
                    .map((btn) =>
                      btn.type === 'web_url'
                        ? {
                            type: 'web_url',
                            url: btn.payloadOrUrl,
                            title: truncateText(btn.title, WHATSAPP_LIMITS.MAX_BUTTON_TITLE_LENGTH),
                          }
                        : {
                            type: 'postback',
                            payload: btn.payloadOrUrl,
                            title: truncateText(btn.title, WHATSAPP_LIMITS.MAX_BUTTON_TITLE_LENGTH),
                          },
                    ),
                })),
            },
          },
        },
      });

      return payloads;
    }
  }
}

/**
 * Polymorphically compiles channel-neutral UI blocks into strict WhatsApp Cloud API or
 * Instagram Messaging API Graph payloads after variable interpolation.
 */
export function compileOutboundMessages(
  channel: OmnichannelChannel,
  channelAccountId: string,
  recipientId: string,
  components: AbstractUiComponent[],
  variables: Record<string, unknown>,
): CompiledProviderRequest[] {
  const results: CompiledProviderRequest[] = [];

  for (const rawComponent of components) {
    const interpolated = interpolateUiComponent(rawComponent, variables);
    const providerPayloads =
      channel === 'whatsapp'
        ? compileComponentForWhatsApp(recipientId, interpolated)
        : compileComponentForInstagram(recipientId, interpolated);

    for (const body of providerPayloads) {
      results.push({
        channel,
        endpointAccountId: channelAccountId,
        body,
      });
    }
  }

  return results;
}
