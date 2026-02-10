import type { ChatMessage } from "../../state/types";

export interface ProviderSendInput {
  messages: ChatMessage[];
  prompt: string;
}

export interface ProviderSendOutput {
  reply: string;
}

export interface ProviderClient {
  readonly name: string;
  send(input: ProviderSendInput): Promise<ProviderSendOutput>;
}
