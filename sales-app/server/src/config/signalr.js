let WebPubSubServiceClient, WebPubSubEventHandler;

try {
  WebPubSubServiceClient = require('@azure/web-pubsub').WebPubSubServiceClient;
  WebPubSubEventHandler = require('@azure/web-pubsub-express').WebPubSubEventHandler;
} catch (error) {
  console.log('Azure Web PubSub packages not installed - WebSocket features disabled');
}

// Azure SignalR Service設定
const HUB_NAME = 'hearing';

class SignalRService {
  constructor() {
    this.serviceClient = null;
    this.eventHandler = null;
  }

  initialize(connectionString) {
    if (!connectionString || !WebPubSubServiceClient) {
      console.log('Azure SignalR not configured - real-time API will work without WebSocket');
      return false;
    }

    try {
      this.serviceClient = new WebPubSubServiceClient(connectionString, HUB_NAME);
      this.eventHandler = new WebPubSubEventHandler(HUB_NAME, {
        path: '/realtime/eventhandler',
        handleConnect: async (req, res) => {
          console.log(`Client ${req.context.userId} connected`);
          res.success();
        },
        handleUserEvent: async (req, res) => {
          console.log(`Received message from ${req.context.userId}:`, req.data);
          res.success();
        }
      });
      
      console.log('Azure SignalR Service initialized');
      return true;
    } catch (error) {
      console.error('Failed to initialize Azure SignalR:', error);
      return false;
    }
  }

  async getClientAccessUrl(userId, sessionId) {
    if (!this.serviceClient) {
      throw new Error('SignalR Service not initialized');
    }

    const token = await this.serviceClient.getClientAccessToken({
      userId: String(userId),  // userIdを文字列に変換
      roles: ['webpubsub.sendToGroup', 'webpubsub.joinLeaveGroup'],
      groups: [sessionId]
    });

    return token.url;
  }

  async sendToUser(userId, message) {
    if (!this.serviceClient) {
      throw new Error('SignalR Service not initialized');
    }

    await this.serviceClient.sendToUser(userId, message);
  }

  async sendToGroup(groupId, message) {
    if (!this.serviceClient) {
      throw new Error('SignalR Service not initialized');
    }

    await this.serviceClient.sendToGroup(groupId, message);
  }

  getEventHandler() {
    return this.eventHandler;
  }
}

module.exports = new SignalRService();