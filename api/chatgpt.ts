import { ChatGPTAPI as ChatGPTAPI35 } from '../chatgpt-5.1.1/index';

export default class ChatGptMessageProvider {

	public useAutoLogin?: boolean;
	public useGpt3?: boolean;
	public chromiumPath?: string;
	public profilePath?: string;
	public model?: string;

	private apiGpt35?: ChatGPTAPI35;
	private conversationId?: string;
	private messageId?: string;

	private abortController?: AbortController;
	private currentMessageId: string = "";
	private response: string = "";
    private inProgress: boolean = false;
    private code = ""


    public async setup({ code, model, apiKey, organization, max_tokens, temperature, apiBaseUrl, top_p }): Promise<boolean> {
        this.code = code;
        this.apiGpt35 = new ChatGPTAPI35({
            apiKey,
            fetch: fetch,
            apiBaseUrl: apiBaseUrl?.trim() || undefined,
            organization,
            completionParams: {
                model,
                max_tokens,
                temperature,
                top_p,
            }
        });

    return true;
}

private get systemContext() {
    return `You are ChatGPT helping the User with pair programming.`;
}

private processQuestion(question: string, code?: string, language?: string) {
    if (code != null) {
        // Add prompt prefix to the code if there was a code block selected
        question = `${question}${language ? ` (The following code is in ${language} programming language)` : ''}: ${code}`;
    }
    return question + "\r\n";
}

//command: optimize
//code
//previous answer
//Previus answer: null,
//language: the programming language
public async getSuggestions(prompt: string, options: { command: string, code?: string, language?: string; }) {
    let question = this.processQuestion(prompt, this.code, options.language);

    this.inProgress = true;
    this.abortController = new AbortController();

    this.sendMessage({ type: 'addQuestion', value: prompt, code: options.code, autoScroll: this.autoScroll });

    try {
                const gpt3Response = await this.apiGpt35.sendMessage(question, {
                    systemMessage: this.systemContext,
                    messageId: this.conversationId,
                    parentMessageId: this.messageId,
                    abortSignal: this.abortController.signal,
                    onProgress: (partialResponse) => {
                        this.response = partialResponse.text;
                        this.sendMessage({ type: 'addResponse', value: this.response, id: this.conversationId, autoScroll: this.autoScroll, responseInMarkdown });
                    },
                });
                ({ text: this.response, id: this.conversationId, parentMessageId: this.messageId } = gpt3Response);


        const hasContinuation = ((this.response.split("```").length) % 2) === 1;


        this.sendMessage({ type: 'addResponse', value: this.response, done: true, id: this.currentMessageId, autoScroll: this.autoScroll, responseInMarkdown });

    } catch (error: any) {
        let message;
        let apiMessage = error?.response?.data?.error?.message || error?.tostring?.() || error?.message || error?.name;

        if (error?.response?.status || error?.response?.statusText) {
            message = `${error?.response?.status || ""} ${error?.response?.statusText || ""}`;
        } else if (error.statusCode === 400) {
            message = `Your method and your model: '${this.model}' may be incompatible or one of your parameters is unknown. Reset your settings to default. (HTTP 400 Bad Request)`;

        } else if (error.statusCode === 401) {
            message = 'Make sure you are properly signed in. If you are using Browser Auto-login method, make sure the browser is open (You could refresh the browser tab manually if you face any issues, too). If you stored your API key in settings.json, make sure it is accurate. If you stored API key in session, you can reset it with `ChatGPT: Reset session` command. (HTTP 401 Unauthorized) Potential reasons: \r\n- 1.Invalid Authentication\r\n- 2.Incorrect API key provided.\r\n- 3.Incorrect Organization provided. \r\n See https://platform.openai.com/docs/guides/error-codes for more details.';
        } else if (error.statusCode === 403) {
            message = 'Your token has expired. Please try authenticating again. (HTTP 403 Forbidden)';
        } else if (error.statusCode === 404) {
            message = `Your method nd your model: '${this.model}' may be incompatible or you may have exhausted your ChatGPT subscription allowance. (HTTP 404 Not Found)`;
        } else if (error.statusCode === 429) {
            message = "Too many requests try again later. (HTTP 429 Too Many Requests) Potential reasons: \r\n 1. You exceeded your current quota, please check your plan and billing details\r\n 2. You are sending requests too quickly \r\n 3. The engine is currently overloaded, please try again later. \r\n See https://platform.openai.com/docs/guides/error-codes for more details.";
        } else if (error.statusCode === 500) {
            message = "The server had an error while processing your request, please try again. (HTTP 500 Internal Server Error)\r\n See https://platform.openai.com/docs/guides/error-codes for more details.";
        }

        if (apiMessage) {
            message = `${message ? message + " " : ""}

${apiMessage}
`;
        }

        this.sendMessage({ type: 'addError', value: message });

        return;
    }
}

/**
 * Message sender, stores if a message cannot be delivered
 * @param message Message to be send
 */
public sendMessage(message: any) {
    console.log(message)
}
}