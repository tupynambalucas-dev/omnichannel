import { createHmac } from 'node:crypto';
import type { MetaWebhookPayload } from '@tupynambalucas-dev/omnichannel-core';

interface CliArgs {
  channel: 'whatsapp' | 'instagram';
  text?: string;
  buttonId?: string;
  buttonTitle?: string;
  menuId?: string;
  menuTitle?: string;
  from: string;
  name: string;
  phoneId: string;
  url: string;
  appSecret: string;
}

function parseCliArgs(): CliArgs {
  const argv = process.argv.slice(2);
  const result: CliArgs = {
    channel: 'whatsapp',
    from: '5511999998888',
    name: 'Desenvolvedor Local',
    phoneId: process.env.DEFAULT_WHATSAPP_PHONE_NUMBER_ID ?? '106540352242922',
    url: 'http://localhost:3000/webhooks/meta',
    appSecret: process.env.META_APP_SECRET ?? '',
  };

  const getArg = (flag: string): string | undefined => {
    const idx = argv.indexOf(flag);
    if (idx !== -1 && idx + 1 < argv.length) {
      return argv[idx + 1];
    }
    return undefined;
  };

  const channelVal = getArg('--channel');
  if (channelVal !== undefined && channelVal.length > 0) {
    result.channel = channelVal.toLowerCase() === 'instagram' ? 'instagram' : 'whatsapp';
  }

  const textVal = getArg('--text');
  if (textVal !== undefined && textVal.length > 0) {
    result.text = textVal;
  }

  const buttonVal = getArg('--button');
  if (buttonVal !== undefined && buttonVal.length > 0) {
    result.buttonId = buttonVal;
  }

  const buttonTitleVal = getArg('--button-title');
  if (buttonTitleVal !== undefined && buttonTitleVal.length > 0) {
    result.buttonTitle = buttonTitleVal;
  }

  const menuVal = getArg('--menu');
  if (menuVal !== undefined && menuVal.length > 0) {
    result.menuId = menuVal;
  }

  const menuTitleVal = getArg('--menu-title');
  if (menuTitleVal !== undefined && menuTitleVal.length > 0) {
    result.menuTitle = menuTitleVal;
  }

  const fromVal = getArg('--from');
  if (fromVal !== undefined && fromVal.length > 0) {
    result.from = fromVal;
  }

  const nameVal = getArg('--name');
  if (nameVal !== undefined && nameVal.length > 0) {
    result.name = nameVal;
  }

  const phoneIdVal = getArg('--phone-id');
  if (phoneIdVal !== undefined && phoneIdVal.length > 0) {
    result.phoneId = phoneIdVal;
  }

  const urlVal = getArg('--url');
  if (urlVal !== undefined && urlVal.length > 0) {
    result.url = urlVal;
  }

  const secretVal = getArg('--secret');
  if (secretVal !== undefined && secretVal.length > 0) {
    result.appSecret = secretVal;
  }

  const hasText = result.text !== undefined && result.text.length > 0;
  const hasButton = result.buttonId !== undefined && result.buttonId.length > 0;
  const hasMenu = result.menuId !== undefined && result.menuId.length > 0;

  if (!hasText && !hasButton && !hasMenu) {
    result.text = 'Ola, gostaria de conhecer os servicos';
  }

  return result;
}

function buildWhatsAppPayload(args: CliArgs): MetaWebhookPayload {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const messageId = `wamid.SIMULATED_${String(Date.now())}_${Math.random().toString(36).substring(2, 7)}`;

  let messageObject: Record<string, unknown>;

  if (args.buttonId !== undefined && args.buttonId.length > 0) {
    messageObject = {
      from: args.from,
      id: messageId,
      timestamp,
      type: 'interactive',
      interactive: {
        type: 'button_reply',
        button_reply: {
          id: args.buttonId,
          title: args.buttonTitle ?? args.buttonId,
        },
      },
    };
  } else if (args.menuId !== undefined && args.menuId.length > 0) {
    messageObject = {
      from: args.from,
      id: messageId,
      timestamp,
      type: 'interactive',
      interactive: {
        type: 'list_reply',
        list_reply: {
          id: args.menuId,
          title: args.menuTitle ?? args.menuId,
        },
      },
    };
  } else {
    messageObject = {
      from: args.from,
      id: messageId,
      timestamp,
      type: 'text',
      text: {
        body: args.text ?? 'Ola',
      },
    };
  }

  return {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: 'waba_enterprise_default',
        changes: [
          {
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: args.from,
                phone_number_id: args.phoneId,
              },
              contacts: [
                {
                  profile: { name: args.name },
                  wa_id: args.from,
                },
              ],
              messages: [messageObject],
            },
          },
        ],
      },
    ],
  };
}

function buildInstagramPayload(args: CliArgs): MetaWebhookPayload {
  const timestamp = Date.now();
  const messageId = `m_simulated_${String(Date.now())}_${Math.random().toString(36).substring(2, 7)}`;

  let messagingObject: Record<string, unknown>;

  if (args.buttonId !== undefined && args.buttonId.length > 0) {
    messagingObject = {
      sender: { id: args.from },
      recipient: { id: args.phoneId },
      timestamp,
      postback: {
        mid: messageId,
        title: args.buttonTitle ?? args.buttonId,
        payload: args.buttonId,
      },
    };
  } else if (args.menuId !== undefined && args.menuId.length > 0) {
    messagingObject = {
      sender: { id: args.from },
      recipient: { id: args.phoneId },
      timestamp,
      postback: {
        mid: messageId,
        title: args.menuTitle ?? args.menuId,
        payload: args.menuId,
      },
    };
  } else {
    messagingObject = {
      sender: { id: args.from },
      recipient: { id: args.phoneId },
      timestamp,
      message: {
        mid: messageId,
        text: args.text ?? 'Ola via Instagram',
      },
    };
  }

  return {
    object: 'instagram',
    entry: [
      {
        id: 'page_instagram_default',
        time: timestamp,
        messaging: [messagingObject],
      },
    ],
  };
}

async function main(): Promise<void> {
  const args = parseCliArgs();
  const payload =
    args.channel === 'whatsapp' ? buildWhatsAppPayload(args) : buildInstagramPayload(args);

  const rawJson = JSON.stringify(payload);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (args.appSecret.length > 0) {
    const signature = createHmac('sha256', args.appSecret)
      .update(Buffer.from(rawJson, 'utf-8'))
      .digest('hex');
    headers['X-Hub-Signature-256'] = `sha256=${signature}`;
  }

  process.stdout.write(
    `[SIMULATOR] Dispatching simulated ${args.channel.toUpperCase()} webhook...\n`,
  );
  process.stdout.write(`[SIMULATOR] Target URL: ${args.url}\n`);
  process.stdout.write(
    `[SIMULATOR] User: ${args.name} (${args.from}) | Channel Account: ${args.phoneId}\n`,
  );
  if (args.buttonId !== undefined && args.buttonId.length > 0) {
    process.stdout.write(`[SIMULATOR] Interaction: Quick Button Click (${args.buttonId})\n`);
  } else if (args.menuId !== undefined && args.menuId.length > 0) {
    process.stdout.write(`[SIMULATOR] Interaction: Menu List Selection (${args.menuId})\n`);
  } else {
    process.stdout.write(`[SIMULATOR] Interaction: Text ("${args.text ?? ''}")\n`);
  }

  try {
    const response = await fetch(args.url, {
      method: 'POST',
      headers,
      body: rawJson,
    });

    const responseText = await response.text();
    process.stdout.write(`[SIMULATOR] Response HTTP ${String(response.status)}: ${responseText}\n`);

    if (response.ok) {
      process.stdout.write('[SIMULATOR] Webhook successfully received and queued by gateway.\n');
    } else {
      process.stderr.write('[SIMULATOR] Gateway rejected the webhook event.\n');
      process.exitCode = 1;
    }
  } catch (error) {
    process.stderr.write(
      '[SIMULATOR] Failed to reach omnichannel gateway. Is the server running?\n',
    );
    process.stderr.write(`${String(error)}\n`);
    process.exitCode = 1;
  }
}

void main();
