const axios = require('axios');

const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT || '';
const AZURE_OPENAI_KEY = process.env.AZURE_OPENAI_API_KEY || process.env.AZURE_OPENAI_KEY || '';
const EMBEDDING_DEPLOYMENT = process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT || 'text-embedding-ada-002';
const AZURE_OPENAI_API_VERSION = process.env.AZURE_OPENAI_API_VERSION || '2024-02-01';

async function generateEmbedding(text) {
  if (!AZURE_OPENAI_ENDPOINT || !AZURE_OPENAI_KEY) {
    console.warn('Azure OpenAI not configured for embeddings, returning zero vector');
    return new Array(1536).fill(0);
  }

  const url = `${AZURE_OPENAI_ENDPOINT}/openai/deployments/${EMBEDDING_DEPLOYMENT}/embeddings?api-version=${AZURE_OPENAI_API_VERSION}`;

  try {
    const response = await axios.post(url, {
      input: text,
      model: EMBEDDING_DEPLOYMENT
    }, {
      headers: {
        'api-key': AZURE_OPENAI_KEY,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    return response.data.data[0].embedding;
  } catch (error) {
    console.error('Embedding generation error:', error.response?.data || error.message);
    throw error;
  }
}

async function generateEmbeddings(texts) {
  if (!AZURE_OPENAI_ENDPOINT || !AZURE_OPENAI_KEY) {
    console.warn('Azure OpenAI not configured for embeddings');
    return texts.map(() => new Array(1536).fill(0));
  }

  const url = `${AZURE_OPENAI_ENDPOINT}/openai/deployments/${EMBEDDING_DEPLOYMENT}/embeddings?api-version=${AZURE_OPENAI_API_VERSION}`;

  try {
    const response = await axios.post(url, {
      input: texts,
      model: EMBEDDING_DEPLOYMENT
    }, {
      headers: {
        'api-key': AZURE_OPENAI_KEY,
        'Content-Type': 'application/json'
      },
      timeout: 60000
    });

    return response.data.data.map(d => d.embedding);
  } catch (error) {
    console.error('Batch embedding generation error:', error.response?.data || error.message);
    throw error;
  }
}

function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

module.exports = {
  generateEmbedding,
  generateEmbeddings,
  cosineSimilarity
};
