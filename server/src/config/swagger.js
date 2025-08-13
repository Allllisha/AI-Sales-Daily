const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Sales Daily API',
      version: '1.0.0',
      description: '営業日報アプリケーションのAPI仕様書',
      contact: {
        name: 'Sales Daily Support',
        email: 'support@salesdaily.com',
      },
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production'
          ? process.env.API_URL || 'https://api.salesdaily.com'
          : `http://localhost:${process.env.PORT || 3002}`,
        description: process.env.NODE_ENV === 'production' ? '本番環境' : '開発環境',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT認証トークン',
        },
      },
      schemas: {
        Session: {
          type: 'object',
          properties: {
            sessionId: {
              type: 'string',
              format: 'uuid',
              description: 'セッションID',
            },
            userId: {
              type: 'string',
              description: 'ユーザーID',
            },
            status: {
              type: 'string',
              enum: ['active', 'completed'],
              description: 'セッションステータス',
            },
            slots: {
              type: 'object',
              properties: {
                customer: { type: 'string', description: '顧客名' },
                project: { type: 'string', description: '案件名' },
                next_action: { type: 'string', description: '次のアクション' },
                budget: { type: 'string', description: '予算' },
                schedule: { type: 'string', description: 'スケジュール' },
                participants: { type: 'string', description: '参加者' },
                location: { type: 'string', description: '場所' },
                issues: { type: 'string', description: '課題・リスク' },
              },
            },
            questionsAnswers: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  question: { type: 'string' },
                  answer: { type: 'string' },
                  timestamp: { type: 'string', format: 'date-time' },
                },
              },
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: '作成日時',
            },
          },
        },
        Report: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            user_id: { type: 'integer' },
            report_date: { type: 'string', format: 'date' },
            customer: { type: 'string' },
            project: { type: 'string' },
            next_action: { type: 'string' },
            budget: { type: 'string' },
            schedule: { type: 'string' },
            participants: { type: 'string' },
            location: { type: 'string' },
            issues: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'エラーメッセージ',
            },
          },
        },
      },
    },
    tags: [
      {
        name: 'Authentication',
        description: '認証関連のAPI',
      },
      {
        name: 'Users',
        description: 'ユーザー管理関連のAPI',
      },
      {
        name: 'Reports',
        description: '日報関連のAPI',
      },
      {
        name: 'Realtime',
        description: 'リアルタイムAIヒアリングAPI',
      },
      {
        name: 'AI',
        description: 'AI機能関連のAPI',
      },
      {
        name: 'Analytics',
        description: '分析関連のAPI',
      },
    ],
  },
  apis: [
    './src/routes/*.js',
    './src/routes/realtime.js',
  ],
};

const specs = swaggerJsdoc(options);

module.exports = {
  swaggerUi,
  specs,
};