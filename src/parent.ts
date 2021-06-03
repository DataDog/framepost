import { ProfileEventType, REQUEST_KEY_GET_PROFILE } from './constants';
import { getLogger } from './logger';
import { SharedClient, SharedClientOptions } from './shared';
import type { MessageProfileEvent, MessageProfile } from './types';
import { profileMessages } from './utils';

export interface ParentClientOptions extends SharedClientOptions {}

export class ParentClient<C = any> extends SharedClient<C> {
    constructor(options: ParentClientOptions = {}) {
        super(options);
    }

    /**
     * Request a channel with a child client in an iframe. Must be called after child
     * frame is fully loaded.
     */
    requestChannel<T>(targetWindow: Window | null, context: T) {
        if (targetWindow) {
            const messageChannel = new MessageChannel();

            this.messagePort = messageChannel.port1;

            const message = this.getInitMessage(context);

            this.messagePort.onmessage = this.initListener.bind(this);

            this.setInitTimer();

            targetWindow.postMessage(message, '*', [messageChannel.port2]);

            this.profiler.logEvent(ProfileEventType.POST_MESSAGE, message);
        } else {
            this.logger.error(
                'Not initializing channel: contentWindow object was null'
            );
        }
    }

    async getMessageProfile(): Promise<MessageProfile[]> {
        const childEvents = await this.request<any, MessageProfileEvent[]>(
            REQUEST_KEY_GET_PROFILE
        );
        const events = this.profiler.getEvents();

        return profileMessages(events, childEvents);
    }

    protected onChannelInit() {}

    protected getLogger() {
        return getLogger('parent-client', this.debug);
    }

    destroy() {
        if (this.messagePort) {
            this.messagePort.close();
        }

        if (this.initTimer) {
            clearTimeout(this.initTimer);
        }
    }
}
