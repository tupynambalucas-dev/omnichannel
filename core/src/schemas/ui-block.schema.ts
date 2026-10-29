import { z } from 'zod';
import { INSTAGRAM_LIMITS, WHATSAPP_LIMITS } from '../constants.js';
import { OmnichannelChannelSchema } from './envelope.schema.js';

export const AbstractActionOptionSchema = z
  .object({
    id: z.string().min(1).max(256),
    title: z.string().min(1).max(80),
    description: z.string().max(WHATSAPP_LIMITS.MAX_LIST_ROW_DESCRIPTION_LENGTH).optional(),
  })
  .strict();
export type AbstractActionOption = z.infer<typeof AbstractActionOptionSchema>;

export const AbstractCardButtonSchema = z
  .object({
    type: z.enum(['postback', 'web_url']),
    title: z.string().min(1).max(WHATSAPP_LIMITS.MAX_BUTTON_TITLE_LENGTH),
    payloadOrUrl: z.string().min(1).max(1000),
  })
  .strict();
export type AbstractCardButton = z.infer<typeof AbstractCardButtonSchema>;

export const AbstractCarouselCardSchema = z
  .object({
    id: z.string().min(1).max(128),
    title: z.string().min(1).max(INSTAGRAM_LIMITS.MAX_ELEMENT_TITLE_LENGTH),
    subtitle: z.string().max(INSTAGRAM_LIMITS.MAX_ELEMENT_SUBTITLE_LENGTH).optional(),
    imageUrl: z.url().optional(),
    buttons: z.array(AbstractCardButtonSchema).min(1).max(INSTAGRAM_LIMITS.MAX_TEMPLATE_BUTTONS),
  })
  .strict();
export type AbstractCarouselCard = z.infer<typeof AbstractCarouselCardSchema>;

export const TextBlockSchema = z
  .object({
    kind: z.literal('TEXT'),
    body: z.string().min(1).max(WHATSAPP_LIMITS.MAX_BODY_TEXT_LENGTH),
    previewUrl: z.boolean().default(false),
  })
  .strict();

export const QuickChoicesBlockSchema = z
  .object({
    kind: z.literal('QUICK_CHOICES'),
    headerText: z.string().max(WHATSAPP_LIMITS.MAX_HEADER_TEXT_LENGTH).optional(),
    body: z.string().min(1).max(INSTAGRAM_LIMITS.MAX_TEXT_LENGTH),
    footerText: z.string().max(WHATSAPP_LIMITS.MAX_FOOTER_TEXT_LENGTH).optional(),
    options: z.array(AbstractActionOptionSchema).min(1).max(INSTAGRAM_LIMITS.MAX_QUICK_REPLIES),
  })
  .strict();

export const MenuChoicesBlockSchema = z
  .object({
    kind: z.literal('MENU_CHOICES'),
    headerText: z.string().max(WHATSAPP_LIMITS.MAX_HEADER_TEXT_LENGTH).optional(),
    body: z.string().min(1).max(INSTAGRAM_LIMITS.MAX_TEXT_LENGTH),
    footerText: z.string().max(WHATSAPP_LIMITS.MAX_FOOTER_TEXT_LENGTH).optional(),
    menuButtonLabel: z
      .string()
      .min(1)
      .max(WHATSAPP_LIMITS.MAX_LIST_BUTTON_LABEL_LENGTH)
      .default('Options'),
    sectionTitle: z.string().min(1).max(24).default('Available Options'),
    options: z.array(AbstractActionOptionSchema).min(1).max(WHATSAPP_LIMITS.MAX_LIST_ROWS),
  })
  .strict();

export const CtaUrlBlockSchema = z
  .object({
    kind: z.literal('CTA_URL'),
    headerText: z.string().max(WHATSAPP_LIMITS.MAX_HEADER_TEXT_LENGTH).optional(),
    body: z.string().min(1).max(INSTAGRAM_LIMITS.MAX_TEXT_LENGTH),
    footerText: z.string().max(WHATSAPP_LIMITS.MAX_FOOTER_TEXT_LENGTH).optional(),
    buttonLabel: z.string().min(1).max(WHATSAPP_LIMITS.MAX_BUTTON_TITLE_LENGTH),
    url: z.url(),
  })
  .strict();

export const CarouselCardsBlockSchema = z
  .object({
    kind: z.literal('CAROUSEL_CARDS'),
    introText: z.string().max(INSTAGRAM_LIMITS.MAX_TEXT_LENGTH).optional(),
    cards: z.array(AbstractCarouselCardSchema).min(1).max(INSTAGRAM_LIMITS.MAX_CAROUSEL_ELEMENTS),
  })
  .strict();

export const AbstractUiComponentSchema = z.discriminatedUnion('kind', [
  TextBlockSchema,
  QuickChoicesBlockSchema,
  MenuChoicesBlockSchema,
  CtaUrlBlockSchema,
  CarouselCardsBlockSchema,
]);
export type AbstractUiComponent = z.infer<typeof AbstractUiComponentSchema>;

export const OutboundDispatchJobSchema = z
  .object({
    jobId: z.uuid(),
    tenantId: z.uuid(),
    sessionId: z.uuid().optional(),
    channel: OmnichannelChannelSchema,
    channelAccountId: z.string().min(1),
    recipientId: z.string().min(1),
    conversationKey: z.string().min(3),
    idempotencyKey: z.string().min(8).max(256),
    components: z.array(AbstractUiComponentSchema).min(1),
    variables: z.record(z.string(), z.unknown()).default({}),
  })
  .strict();
export type OutboundDispatchJob = z.infer<typeof OutboundDispatchJobSchema>;
