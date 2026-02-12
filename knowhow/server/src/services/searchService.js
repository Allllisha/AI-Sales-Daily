const { SearchClient, AzureKeyCredential } = require('@azure/search-documents');
const { generateEmbedding } = require('./embeddingService');

const AZURE_SEARCH_ENDPOINT = process.env.AZURE_SEARCH_ENDPOINT || '';
const AZURE_SEARCH_KEY = process.env.AZURE_SEARCH_KEY || '';
const INDEX_NAME = process.env.AZURE_SEARCH_INDEX || 'knowledge-index';

let searchClient = null;

function getSearchClient() {
  if (!searchClient && AZURE_SEARCH_ENDPOINT && AZURE_SEARCH_KEY) {
    searchClient = new SearchClient(
      AZURE_SEARCH_ENDPOINT,
      INDEX_NAME,
      new AzureKeyCredential(AZURE_SEARCH_KEY)
    );
  }
  return searchClient;
}

async function semanticSearch(query, options = {}) {
  const client = getSearchClient();

  if (!client) {
    console.warn('Azure Cognitive Search not configured, falling back to DB search');
    return { results: [], fallback: true };
  }

  try {
    const queryVector = await generateEmbedding(query);

    const searchOptions = {
      vectorSearchOptions: {
        queries: [{
          kind: 'vector',
          vector: queryVector,
          kNearestNeighborsCount: options.top || 10,
          fields: ['contentVector']
        }]
      },
      select: ['id', 'title', 'content', 'category', 'work_type', 'risk_level'],
      top: options.top || 10
    };

    if (options.filter) {
      searchOptions.filter = options.filter;
    }

    const searchResults = await client.search(query, searchOptions);

    const results = [];
    for await (const result of searchResults.results) {
      results.push({
        id: result.document.id,
        title: result.document.title,
        content: result.document.content,
        category: result.document.category,
        work_type: result.document.work_type,
        risk_level: result.document.risk_level,
        score: result.score
      });
    }

    return { results, fallback: false };
  } catch (error) {
    console.error('Azure Search error:', error.message);
    return { results: [], fallback: true };
  }
}

async function indexDocument(document) {
  const client = getSearchClient();

  if (!client) {
    console.warn('Azure Cognitive Search not configured, skipping indexing');
    return false;
  }

  try {
    const contentForEmbedding = `${document.title}\n${document.content}`;
    const contentVector = await generateEmbedding(contentForEmbedding);

    const result = await client.uploadDocuments([{
      id: String(document.id),
      title: document.title,
      content: document.content,
      category: document.category,
      work_type: document.work_type || '',
      risk_level: document.risk_level || 'low',
      contentVector
    }]);

    console.log(`Indexed document ${document.id} to Azure Search`);
    return result.results[0].succeeded;
  } catch (error) {
    console.error('Indexing error:', error.message);
    return false;
  }
}

async function deleteDocument(documentId) {
  const client = getSearchClient();

  if (!client) {
    return false;
  }

  try {
    await client.deleteDocuments([{ id: String(documentId) }]);
    return true;
  } catch (error) {
    console.error('Delete from index error:', error.message);
    return false;
  }
}

module.exports = {
  semanticSearch,
  indexDocument,
  deleteDocument,
  getSearchClient
};
