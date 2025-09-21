# Building a Document Ingestion & Retrieval Backend with LangChain.js, Gemini LLM, and MongoDB

## Introduction  
In this guide, we will build a prototype backend system for intelligent document processing and retrieval. The goal is to ingest rich text documents (HTML with embedded images from a CKEditor frontend), analyze and summarize them with an LLM (Google’s **Gemini 2.5 Flash** model), store the processed content and embeddings in a MongoDB database, and expose a simple REST API for retrieval. We will use a Retrieval-Augmented Generation (RAG) approach, meaning the system combines an LLM with a document knowledge base to produce grounded outputs. This ensures that summaries and answers are backed by the ingested documents, improving accuracy and relevance.  

**Tech Stack Overview:**  
- **Next.js + TypeScript Frontend** (already set up) – for the UI where users submit documents and query the system.  
- **Node.js Backend** (we can implement as Next.js API routes or an Express server) – handles ingestion and retrieval API endpoints.  
- **LangChain.js** – an LLM application framework to orchestrate calls to the Gemini model and manage vector embeddings in MongoDB.  
- **Gemini 2.5 Flash LLM** – the large language model (via Google’s API) used for summarization and insight extraction. Notably, Gemini 2.5 Flash is a multimodal model: it accepts text *and images* as input and returns text output, which suits our use case of documents with embedded images.  
- **MongoDB** – used for storing document data (text content, summaries, image metadata) and vector embeddings for semantic search. We will leverage MongoDB’s vector search capability to find relevant documents by embedding similarity.  

**Overall Flow:** When a user submits content through the frontend, the backend will parse the HTML and images, call the Gemini LLM to generate a summary (and possibly other insights), create a vector embedding of the content for semantic search, and store everything in MongoDB. Later, when the user queries the system, the backend will embed the query, perform a vector similarity search in MongoDB to retrieve relevant documents, and return those documents (and their summaries) as results. This forms a basic RAG pipeline where the LLM’s output is augmented by actual document data.

 *Figure: High-level architecture of an intelligent document processing pipeline. Documents are ingested (with OCR for scans), analyzed by AI (LLM for summarization and key data extraction), stored with embeddings, and finally retrieved via semantic search. This prototype focuses on the backend (ingestion, processing, storage, and retrieval components).*  

## Setup and Dependencies  

**1. Node.js Project Initialization:** If you haven’t already, initialize a Node.js project for the backend (you can also use Next.js API routes within your existing app). For a standalone backend, run npm init -y and then install the required packages.  

**2. Install Required Packages:** We will need the Google GenAI SDK for Node (to call Gemini), LangChain for JS/TS, the MongoDB driver and LangChain’s MongoDB integration, plus any embedding model library (if using a separate one). Run:  

bash
npm install @google/genai @langchain/core @langchain/mongodb mongodb

If you plan to use OpenAI for embeddings (as an alternative to Gemini’s embedding model), also install the OpenAI integration:  

bash
npm install @langchain/openai

The @google/genai SDK is Google’s official client for the Generative AI (Gemini) API. LangChain’s @langchain/mongodb package provides the MongoDBAtlasVectorSearch class which helps store and query vectors in MongoDB. We also include the basic MongoDB driver (mongodb) to connect to the database. 

**3. Environment Variables and Credentials:**  
   - **MongoDB:** If using MongoDB Atlas, get your connection URI. For local MongoDB, use the local URI (e.g. mongodb://localhost:27017). Set an env var MONGODB_URI with this value, along with MONGODB_DB_NAME and MONGODB_COLLECTION for the database and collection names you’ll use.  
   - **Google Gemini API:** You need to authenticate with Google’s Vertex AI Generative service. You can use **Application Default Credentials (ADC)** or an API key. For ADC, set up your GCP project with Vertex AI enabled and export GOOGLE_APPLICATION_CREDENTIALS (path to a service account JSON) or ensure your environment is authenticated (e.g., if running on a GCP VM). Also set GOOGLE_CLOUD_PROJECT (your project ID) and GOOGLE_CLOUD_LOCATION (e.g. global) as environment variables. The GenAI SDK will pick these up. If using an API key, you can supply it when initializing the GenAI client (or set GENAI_API_KEY).  
   - **OpenAI (optional):** If you use OpenAI’s embedding API, set OPENAI_API_KEY.  

Make sure to load these env vars in your app (you can use a .env file and a library like dotenv). For Next.js API routes, you can put them in a .env.local file. Also, if implementing within Next.js 13+, ensure to run the route as a Node.js runtime (not the default Edge runtime) because we need Node.js libraries. You can do this by adding export const runtime = "nodejs"; at the top of your API route file. 

**4. Setting Up MongoDB for Vector Search:** Use a MongoDB version 7.0+ (Atlas or local) that supports vector search. In MongoDB Atlas, create a Search index on your collection for the embedding field. For example, in the Atlas UI under Search -> Create Index, choose Vector Search, and use a JSON configuration like:  

{
  "fields": [
    {
      "path": "embedding",
      "type": "vector",
      "numDimensions": 1536,
      "similarity": "euclidean"
    }
  ]
}

This assumes your embeddings are 1536-dimensional (which is the case if using OpenAI’s text-embedding-ada-002 model). Adjust numDimensions to match the embedding model you use (e.g., Cohere models might be 1024, some BERT models 768, etc.). The above config uses Euclidean distance for similarity; you could also choose cosine. Name this index (e.g., “vector_index”) – by default LangChain looks for an index named “default”, but we can specify a custom name in code.  

**5. (Optional) Embedding Model Choice:** For this prototype, you have two options to get vector embeddings:  
   - **Use Gemini (or Google) Embeddings:** Google has an experimental embedding model (e.g., gemini-embedding-001). If accessible, you could call a Vertex AI endpoint for embeddings. However, the GenAI SDK primarily covers content generation; you might need to use Google’s **Generative Language API** for embeddings (previously PaLM API, e.g., the model textembedding-gecko-001). This requires a separate call. For simplicity, many developers use OpenAI or other providers for embeddings even when using Gemini for text.  
   - **Use OpenAI or another library:** The OpenAI embedding API is straightforward and returns 1536-dim vectors. Alternatively, you could use a local model via Hugging Face (e.g., sentence-transformers) if you can run Python or a TFJS model. In our guide, we will illustrate using OpenAI’s embeddings for ease (since LangChain integration supports it out-of-the-box). You can swap this out later with a different model.  

With setup done, let’s design the data model and API routes.

## Data Model in MongoDB (Document Schema)  
We will store each submitted document (from CKEditor) as a document in a MongoDB collection, with fields capturing both raw content and processed results. A simple schema could be:  

- htmlContent (String) – The original HTML string as received (including base64 image data). Storing this allows exact re-rendering of the content if needed. For large images or many images, consider storing images separately to avoid bloating this field.  
- textContent (String) – The plain text extracted from the HTML (all HTML tags removed, and possibly placeholders for images). This is used for embedding generation and as input to the LLM if we choose not to send raw HTML.  
- imageContexts (Array of Strings) – Textual context extracted from images. This could be the result of OCR on images containing text, or captions generated for the images. Each entry corresponds to one embedded image. (If using Gemini’s image understanding directly, this may be optional, but we store it for completeness and possibly to include in the embedding.)  
- summary (String) – The summary or insights generated by the LLM for this document. This is what we’ll return to users as a quick overview of the document’s content.  
- embedding (Array of Float) – The vector embedding of the document’s content, used for semantic search. We typically embed the full text content (including any image-derived text) so that the vector represents the document’s meaning.  

We might also include metadata like an auto-generated _id, a title or filename if provided, createdAt timestamp, etc., but the above are the key fields for our purposes. 

In a production system, you might not store large images directly in MongoDB (instead storing them on a cloud storage like S3 and keeping a URL or reference). For our prototype, since CKEditor gives images as base64 in HTML, we will initially keep them in htmlContent (or optionally strip them out after processing). The important part is capturing any information from images that’s relevant (in imageContexts) for summarization and search.

## Implementing the Ingestion Pipeline (POST /api/ingest)  

We will create an API endpoint (for example, a POST route at /api/ingest) that accepts the HTML content (with images) from the frontend and processes it through several steps:  

**Step 1: Receive and Parse the HTML Input**  
The request body will contain the HTML string (and possibly some metadata like a title). For example, the frontend might send JSON like: {"html": "<p>Some text ... <img src=\"data:image/png;base64,...\" /></p>"}. In our route handler, we need to:  

- Extract the HTML string.  
- Parse it to separate text and images. We can use a library like cheerio or jsdom to parse HTML. For simplicity, one can also use regex to find <img src="data:...base64,..."> tags, but an HTML parser is more robust.  
- For each <img> tag found:
  - Get the base64 data and decode it. The tag looks like <img src="data:image/png;base64,<BASE64_DATA>" />. We’ll pull out the base64 part after the comma. 
  - Optionally, generate a placeholder tag or note its position in text. (e.g., replace the <img> in the HTML with [Image${n}] or some marker, or simply remove it from the text content extraction since images don’t have text nodes.)
- Extract the plain text from the HTML (e.g., using Cheerio’s text() function which gives all text content). This gives us textContent. If we removed images, textContent will just be the text around them. We may want to insert something like “ [Image] ” in place of each image so that the LLM knows there was an image there (which might be relevant). Alternatively, we keep the structure and let the LLM handle HTML (though often it’s better to avoid raw HTML in the prompt).  

**Step 2: Extract Image Context**  
For each image we decoded, we should extract any meaningful information:
  - If the images contain text (e.g., a screenshot of a document or scanned PDF), run **OCR** on them (Tesseract.js or an OCR API) to get text. 
  - If the images are photos/diagrams, we can use an image captioning model to describe them (this could be an external API or a local model).  
  - If using Gemini’s multimodal capability, an alternative is to not manually OCR or caption at this step, and instead let the LLM analyze the image directly by providing it to the model (we’ll do that in the next step). Gemini 2.5 Flash can interpret images as input, so we could rely on it. However, to be safe and to have data for embedding, we’ll also get at least some textual context. 

For our prototype, a simple approach is to perform OCR on images (since documents likely have diagrams or text). For example, using Tesseract.js:
const { createWorker } = require('tesseract.js');
const worker = await createWorker();
await worker.load();
await worker.loadLanguage('eng');
await worker.initialize('eng');
let imageText = await worker.recognize(imageBuffer);
imageContexts.push(imageText.data.text);
await worker.terminate();
(The above is a synchronous illustration – in practice initialize OCR outside the request for efficiency.) 

If you don’t have OCR, you could skip this and trust the LLM, but including extracted text will improve the summary and search.  

**Step 3: Call Gemini LLM for Summarization/Insight Generation**  
Now we have textContent (the main text) and possibly some imageContexts (text from images). We will prompt the LLM to summarize the document and highlight key points. We’ll craft a system prompt to instruct the model to consider both text and images. For example: “You are a document analysis AI. Summarize the following document, incorporating relevant information from any images. Focus on key points and important data.” (We provide a detailed prompt in a later section.) 

Using the Google GenAI SDK (@google/genai), we can call the model with both the text and image data. The SDK allows sending an array of inputs under the contents field. We can include binary image data and text strings in this array. For instance:  

const genai = require("@google/genai");
const client = new genai.GenerativeAI(/* auth config, e.g., key or ADC */);

// Prepare inputs for model
const contents = [];
for (const img of imagesBufferArray) {
  contents.push(img);  // binary Buffer for each image
}
contents.push(textContent);  // then the text content at the end (or we can combine imageContexts here too)

// Call Gemini 2.5 Flash model for content generation
const response = await client.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: contents,
  parameters: { temperature: 0.2 }
});
const summary = response.text;

In this call, we pass an array of contents: all image buffers followed by the text. The model will receive both modalities. Google’s documentation example shows passing an image and a question as two contents. In our case, we’re giving the model the images and the document text itself (so we are effectively asking it: “Given these images and this text, produce a summary.”). We include a low temperature for a more deterministic summary. 

Note: Ensure the images are in a format the model supports (likely JPEG/PNG). The @google/genai library will internally encode the Buffer appropriately. Also, include your system prompt. The SDK doesn’t have an explicit system prompt field, but you can prepend it to the text content or use the Chat API if available. For example, you might do contents: [systemPrompt, textContent] where systemPrompt is a string like "<<SYS>>Your instructions...<</SYS>>" (if the API uses that convention), or simply merge the instruction into the text as a preface. The specifics may depend on the GenAI SDK version – consult Google’s docs for how to include system instructions.  

The model will return a summary text (and possibly other structured data if we prompt it accordingly). For now, we store the returned summary string. This summary should capture the document’s main points and any important information from images (the system prompt should guide it to do so).  

**Step 4: Generate Vector Embedding**  
Next, we create an embedding of the document’s content. The embedding should represent the semantic content of the document so that similar documents/questions can be matched. We typically use the full textContent plus imageContexts for this. If you obtained OCR text from images, you might append that to the text (e.g., fullTextForEmbedding = textContent + " " + imageContexts.join(" ")). If you didn’t OCR but have the model’s description of images in the summary, you might just embed the text content (or even the summary, though it’s better to embed the full text for maximum information). 

Using LangChain’s embedding classes makes this easy. For example, using OpenAI embeddings:  

import { OpenAIEmbeddings } from "@langchain/openai";
const embeddingsClient = new OpenAIEmbeddings({ 
  modelName: "text-embedding-ada-002"  // or "text-embedding-3-small" as in LangChain docs
});
const embeddingResult = await embeddingsClient.embedQuery(fullTextForEmbedding);

This returns a float array (length 1536 for ada-002). If you prefer, you could call Google’s embedding model similarly (not shown here). Ensure the embedding dimensionality matches what you configured in the Mongo index.  

**Step 5: Store in MongoDB**  
Finally, we store all parts in MongoDB. Using the MongoDB Node driver:  

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
const collection = client.db(MONGODB_DB_NAME).collection(MONGODB_COLLECTION);
const doc = {
  htmlContent: html,                 // original HTML (optional, can store)
  textContent: textContent,          // extracted text
  imageContexts: imageContexts,      // array of strings (could be empty if no images or not processed)
  summary: summary,                  // LLM generated summary
  embedding: embeddingResult,        // vector (array of floats)
  createdAt: new Date()
};
const result = await collection.insertOne(doc);

This inserts the document. The embedding field is the vector which we indexed for search. (On Atlas, the vector search index will asynchronously index this new vector – usually almost instantly but there may be a slight delay.) We can return a response to the client, e.g. the new document’s ID or a success message.  

**Summary of the Ingestion Process:** The /api/ingest route takes in HTML with base64 images, parses it, calls the LLM to get a summary (leveraging Gemini’s ability to analyze both text and images), computes an embedding of the content, and stores everything in MongoDB. At this point, the document is ready to be retrieved via semantic search. 

## Implementing the Retrieval API (GET /api/search)  

The retrieval endpoint will enable searching the ingested documents by a natural language query. This is the “question answering” or document search part of RAG. We’ll implement it as a GET request (e.g. /api/search?query=...). The steps are:  

**Step 1: Embed the Query** – We take the user’s query string (e.g. "fire safety drill procedure") and generate a vector embedding for it, using the same embedding model used for documents. This ensures the query and document vectors live in the same vector space. For example:  
const queryVector = await embeddingsClient.embedQuery(userQuery);

**Step 2: Vector Similarity Search in MongoDB** – Using the query vector, we need to find the most similar document vectors in our collection. If you are using LangChain’s vector store abstraction, you could use that directly. For example, LangChain provides a MongoDBAtlasVectorSearch class which you instantiate with your collection, embeddings, and index name. After adding documents, you can call:  
const results = await vectorStore.similaritySearch(userQuery, 3);
This will return the top 3 most similar documents as LangChain Document objects (with their pageContent and metadata). Under the hood, this uses the Atlas vector search index you created. LangChain’s integration expects certain default field names (“embedding” for the vector and “text” for the raw content) unless overridden, but since we used a custom schema, we should specify those when constructing the MongoDBAtlasVectorSearch. For instance:  

import { MongoDBAtlasVectorSearch } from "@langchain/mongodb";
// (assuming OpenAIEmbeddings as before, and collection is obtained)
const vectorStore = new MongoDBAtlasVectorSearch(embeddingsClient, {
  collection,
  indexName: "vector_index",    // your index name in Atlas
  textKey: "textContent",       // field name of raw text
  embeddingKey: "embedding"     // field name of vector
});
...
const results = await vectorStore.similaritySearch(userQuery, 5);

If you are not using LangChain’s vector store class, you can directly query MongoDB. In Atlas, you’d use an aggregation with $search: 

const resultsCursor = await collection.aggregate([
  {
    $search: {
      index: "vector_index",
      knnBeta: {
        vector: queryVector,
        path: "embedding",
        k: 5
      }
    }
  },
  {
    $project: { // control which fields to return
      _id: 1, summary: 1, textContent: 1, score: { $meta: "searchScore" }
    }
  }
]).toArray();

The above uses the Atlas vector search (knnBeta) to find 5 nearest neighbors by cosine or Euclidean distance (depending on how the index is defined). It then projects the id, summary, text, and the similarity score. In a local MongoDB (without Atlas Search), you’d have to pull all embeddings and compute distances in application code – which is fine for a small prototype set but not scalable. We recommend using Atlas or some vector DB for any non-trivial dataset.  

**Step 3: Return the Results** – We will format the query results into a response. Likely we want to return the document identifier and the summary (so that the frontend can display a quick overview). We might also include other metadata like title if available. For example, a JSON response could look like:  

{
  "results": [
    {
      "id": "647f0abc1234...",
      "summary": "This document outlines the standard *fire safety drill procedures* including preparation, roles, and step-by-step evacuation instructions..."
    },
    {
      "id": "64801def5678...",
      "summary": "Safety circular dated 2023-05-10: **Fire Drill Schedule** – Describes the upcoming fire drill event and responsibilities of station staff..."
    }
  ]
}

This indicates two documents were found relevant to “fire safety drill procedure,” each with a summary. The frontend could allow the user to click to view the full document if needed (by hitting another endpoint like /api/documents/:id to get full HTML or text). In our prototype, we focus on delivering the summary and an identifier. 

If using LangChain’s similaritySearch, the result objects might contain the document text (pageContent) and metadata. Since we stored summary in the document, we could store it in metadata or fetch it in the query projection. We made sure to project summary in the aggregation above. With LangChain, you might load docs with their metadata (you can store the summary in metadata when adding to vectorStore too). For simplicity, you can perform a second query by IDs to get any fields you want, or include them directly in the aggregation as shown. 

At this point, the user’s query is answered by showing the summaries of the top relevant documents. This addresses the retrieval part of RAG – we retrieved relevant snippets (summaries, in this case) from our knowledge base. If we wanted to go further and have the LLM directly answer the query (e.g., for a Q&A chatbot experience), we could take the retrieved documents’ text and feed them, along with the query, into the LLM to generate an answer. That would be an additional step where the LLM uses the documents as context (“grounding”) to answer the question. For now, our /api/search returns the documents and their summaries, and the user can infer the answer or read more if needed. 

## Running and Testing the Prototype Locally  

Now that we have our backend routes, we should test the end-to-end flow. Ensure you have MongoDB running and your environment variables set for Mongo and the Gemini API access. Then:  

1. **Start the Backend Server:** If using Next.js API routes, run npm run dev and ensure your API endpoints are being served (usually at http://localhost:3000/api/ingest and http://localhost:3000/api/search). If you wrote a separate Express server, run it with Node (node index.js or however you configured) – assume it’s on http://localhost:3001 for this example.  

2. **Test Document Ingestion:** Use an HTTP client or cURL to send a POST request with a sample HTML. For example:  

curl -X POST "http://localhost:3000/api/ingest" \
  -H "Content-Type: application/json" \
  -d '{
        "html": "<h1>Fire Drill Procedure</h1><p>All employees must participate in the quarterly fire drill.</p><ul><li>Alarm will sound at 10 AM.</li><li>Evacuate calmly to the nearest exit.</li></ul><p><img src=\"data:image/png;base64,iVBORw0KGg...\" alt=\"Floor plan\" /></p>"
      }'

(The above HTML includes a heading, some instructions, and an embedded image with a base64 string truncated for brevity.)  

If everything is set up, the backend will: parse this HTML, run it through Gemini (which will analyze the text and the image of the floor plan if provided), produce a summary, generate an embedding, and insert into MongoDB. The API should respond with a success message or perhaps the new document’s ID. Check your server logs or console for any errors. If the LLM call fails (e.g., credentials issues or the content is too large), debug accordingly – you may need to reduce the content or ensure your auth is correct. For large documents, Gemini 2.5 has a huge context window (1M tokens), but sending very large images or many images might cause delays or cost issues, so test with smaller content first. 

3. **Test Retrieval:** After ingesting one or more documents, test the search API. For example, if we ingested the fire drill procedure, try:  

curl "http://localhost:3000/api/search?query=fire drill"

The backend will embed “fire drill” and search. The result (as JSON) might be:  

{
  "results": [
    {
      "id": "649a1234567abcdef...",
      "summary": "This document outlines the standard fire drill procedure that all employees must follow. It covers the timing of the alarm (10 AM) and instructions to evacuate calmly to the nearest exit, referencing the floor plan for exit routes."
    }
  ]
}

You can adjust the query to test semantic matching. For example, even if the exact words “fire drill” weren’t in the text but the concept was (evacuation, alarm, etc.), the vector search should still find it. Try a query like “emergency evacuation” or “map of exits” – the embedding similarity should catch the relevance due to semantic meaning.  

If no results are returned, double-check that embeddings were stored and the index is configured properly. In Atlas, ensure the search index is active. If using LangChain’s vector store, ensure you called addDocuments or used the same instance that holds the data (our example inserted directly with the Mongo driver, so LangChain wouldn’t know about it unless we either use LangChain to add or just query via aggregation as shown). You might prefer to use LangChain consistently: e.g., instead of inserting manually, do vectorStore.addDocuments([ new Document({ pageContent: fullText, metadata: {summary, ...} }) ]) which will handle storing text, embedding, etc. But for clarity we showed the manual method. In either case, confirm that the embedding field in Mongo has the vector (a large array of floats) and the index is on that field.  

4. **Iterate & Improve:** This prototype covers the basics. You can improve it by adding error handling, authentication (if this were a multi-user system), and optimizing the flow (for instance, processing the LLM call and the DB insert asynchronously, or batching operations). You can also implement a GET /api/documents/:id route to fetch the full HTML or text of a document when the user wants to read more than just the summary. Another useful addition is to use the LLM at query time to generate a direct answer from the retrieved docs (true QA mode), but that would involve prompting Gemini with the query and the retrieved text.  

Finally, ensure to shut down your server and any external services (like if you started a local Mongo or the OCR worker) when done testing. 

## Prompt Design for Gemini Summarization (System Prompt)  
Crafting a good system prompt for the LLM is crucial to get useful summaries that include insights from both text and images. Below is a high-quality system prompt tailored for Gemini 2.5 that we can use when calling the model to summarize HTML content with images:

**System Prompt (for Document Summarization):** 

You are an expert document analysis AI. You will be given the content of a document, which may include HTML formatting and embedded images (as image data or descriptions). Ignore irrelevant formatting and focus on the substantive content.
Your task is to provide a concise summary of the document, highlighting the key points, important facts, and any actionable insights. If the document contains images that add information (such as charts, diagrams, or text in images), incorporate the relevant details from those images into the summary. For example, if an image is a floor plan or contains text, describe its important content.
The summary should be clear and informative. Use bullet points to list the main points or findings:
- Main point or finding 1 from the document (covering text or image content as needed).
- Key point 2, with any critical data or dates.
- Insight 3, etc.
Avoid verbosity or unnecessary detail; be precise and focus on what a reader needs to know. If the document is an announcement or directive, include any obligations or timelines mentioned.

This system prompt instructs the model to act as a document analysis assistant, to merge information from text and images, and to output the summary as bullet points containing key information. By explicitly mentioning images and the format, we guide Gemini to produce a useful, structured summary that includes “insight generation” (i.e., highlighting important data or implications). 

With this prompt in place, when our backend calls the Gemini model (as described in the ingestion step), we include this instruction. The resulting summary should capture the essence of the document and any visual content, providing users a quick understanding of their documents. 

---

You now have a complete prototype backend for document ingestion, processing, storage, and retrieval. Using Next.js and Tailwind on the frontend, you can build a user interface to upload documents (HTML from the editor) and query them, while the backend we constructed handles the heavy lifting of AI summarization and semantic search. This system can be run locally for testing and forms the foundation for a more robust, scalable Document Intelligence platform. Good luck, and happy coding! 
