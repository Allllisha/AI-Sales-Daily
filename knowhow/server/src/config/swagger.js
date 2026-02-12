const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Knowhow API',
      version: '1.0.0',
      description: 'ノウハウ共有AI音声アシスタント APIドキュメント',
      contact: {
        name: 'Knowhow Support',
      },
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production'
          ? process.env.API_URL || 'https://knowhow-api.azurewebsites.net'
          : `http://localhost:${process.env.PORT || 3001}`,
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
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
            role: { type: 'string', enum: ['worker', 'expert', 'site_manager', 'admin'] },
            department: { type: 'string' },
            site_id: { type: 'string', format: 'uuid', nullable: true },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        KnowledgeItem: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            content: { type: 'string' },
            summary: { type: 'string', nullable: true },
            category: { type: 'string', enum: ['procedure', 'safety', 'quality', 'cost', 'equipment', 'material'] },
            work_type: { type: 'string' },
            risk_level: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
            status: { type: 'string', enum: ['draft', 'review', 'published', 'archived'] },
            author_id: { type: 'string', format: 'uuid' },
            version: { type: 'integer' },
            view_count: { type: 'integer' },
            useful_count: { type: 'integer' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        IncidentCase: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            description: { type: 'string' },
            cause: { type: 'string' },
            countermeasure: { type: 'string' },
            work_type: { type: 'string' },
            severity: { type: 'string', enum: ['minor', 'moderate', 'serious', 'critical'] },
            occurred_at: { type: 'string', format: 'date' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        Checklist: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            work_type: { type: 'string' },
            description: { type: 'string' },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  content: { type: 'string' },
                  priority: { type: 'string', enum: ['required', 'recommended', 'optional'] },
                  order_index: { type: 'integer' },
                },
              },
            },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        VoiceSession: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            user_id: { type: 'string', format: 'uuid' },
            mode: { type: 'string', enum: ['office', 'field'] },
            site_id: { type: 'string', format: 'uuid', nullable: true },
            work_type: { type: 'string', nullable: true },
            status: { type: 'string', enum: ['active', 'completed', 'cancelled'] },
            created_at: { type: 'string', format: 'date-time' },
            completed_at: { type: 'string', format: 'date-time', nullable: true },
          },
        },
        Site: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            location: { type: 'string' },
            description: { type: 'string' },
            status: { type: 'string', enum: ['active', 'completed', 'suspended'] },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string', description: 'Error message' },
          },
        },
      },
    },
    tags: [
      { name: 'Authentication', description: '認証関連のAPI' },
      { name: 'Knowledge', description: 'ナレッジ管理API' },
      { name: 'Incidents', description: '事例管理API' },
      { name: 'Checklists', description: 'チェックリスト管理API' },
      { name: 'AI', description: 'AI対話・分析API' },
      { name: 'Speech', description: '音声処理API' },
      { name: 'Analytics', description: '分析・統計API' },
      { name: 'Sites', description: '現場管理API' },
      { name: 'Users', description: 'ユーザー管理API' },
    ],
  },
  apis: [
    './src/routes/*.js',
  ],
};

const specs = swaggerJsdoc(options);

module.exports = {
  swaggerUi,
  specs,
};
