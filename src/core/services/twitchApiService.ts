import { AccessToken, RefreshingAuthProvider, AuthProvider } from '@twurple/auth';
import { ApiClient } from '@twurple/api';
import { EventSubWsListener } from '@twurple/eventsub-ws';
import { EventEmitter } from 'events';
import { TWITCH_SCOPES, TWURPLE_INTENTS } from '../../shared/constants';

export interface TwitchConfig{
    clientId: string;
    redirectUri: string;
    broadcasterId: string;
}

export class TwitchApiService extends EventEmitter {
    private authProvider: RefreshingAuthProvider | null = null;
    private apiClient: ApiClient | null = null;
    private eventSubListener: EventSubWsListener | null = null;
    private config: TwitchConfig | null = null;

    constructor(){
        super();
    }

 async initialize(config: TwitchConfig, accessToken: AccessToken) {
        this.config = config;
        
        console.log('[TwitchApi] === INITIALIZE START ===');
        console.log('[TwitchApi] Token scopes:', accessToken.scope);
        console.log('[TwitchApi] Token has refresh:', !!accessToken.refreshToken);
        console.log('[TwitchApi] Broadcaster ID:', config.broadcasterId);

        this.authProvider = new RefreshingAuthProvider({
            clientId: config.clientId,
        });

        console.log('[TwitchApi] Calling addUserForToken with intents:', TWURPLE_INTENTS);
        const userId = await this.authProvider.addUserForToken(accessToken, TWURPLE_INTENTS);
        console.log('[TwitchApi] ✅ addUserForToken SUCCESS, userId:', userId);

        this.apiClient = new ApiClient({
            authProvider: this.authProvider,
        });

        this.eventSubListener = new EventSubWsListener({
            apiClient: this.apiClient,
        });
        console.log('[TwitchApi] === INITIALIZE SUCCESS ===');
    }
    
    async startEventSub(){
        if(!this.eventSubListener || !this.config){
            throw new Error('TwitchApiService not initialized');
        }
        await this.eventSubListener.start();
        console.log('🎧 EventSub WebSocket listener started');

        this.eventSubListener.onChannelRedemptionAdd(this.config.broadcasterId, (redemption) => {
            console.log('🎁 Reward redeemed:', {
                user: redemption.userDisplayName,
                reward: redemption.rewardTitle,
                input: redemption.input,
            });
        this.emit('redemption', redemption);
        });
        console.log('✅ Subscribed to channel redemptions');
    }

    async stopEventSub(){
        if(this.eventSubListener){
            await this.eventSubListener.stop();
            console.log('🛑 EventSub listener stopped');
        }
    }

async createRaffleReward(prize: string, cost: number) {
    if (!this.apiClient || !this.config) {
        throw new Error('TwitchApiService not initialized');
    }

    let title = `🎰 ${prize} (${cost})`;
    
    if (title.length > 45) {
        const maxPrizeLength = 45 - `🎰  (${cost})`.length;
        const trimmedPrize = prize.slice(0, maxPrizeLength - 1) + '…';
        title = `🎰 ${trimmedPrize} (${cost})`;
    }

    const reward = await this.apiClient.channelPoints.createCustomReward(this.config.broadcasterId, {
        title,
        cost,
        prompt: 'Нажми, чтобы попасть в лотерею!',
        isEnabled: true,
        userInputRequired: false,
        backgroundColor: '#FF6B6B',
    });
    
    console.log('🎁 Raffle reward created:', reward.id, `("${title}")`);
    return reward;
}

    async deleteReward(rewardId: string){
        if(!this.apiClient || !this.config){
            throw new Error('TwitchApiService not initialized');
        }
        await this.apiClient.channelPoints.deleteCustomReward(this.config.broadcasterId, rewardId);
        console.log('🗑️ Raffle reward deleted:', rewardId);
    }

    async cancelRedemption(rewardId: string, redemptionId: string){
        if(!this.apiClient || !this.config){
            throw new Error('TwitchApiService not initialized');
        }
        await this.apiClient.channelPoints.updateRedemptionStatusByIds(
            this.config.broadcasterId,
            rewardId,
            [redemptionId],
            'CANCELED'
        );
    }

    getAuthProvider(): AuthProvider | null {
        return this.authProvider;
    }
}
