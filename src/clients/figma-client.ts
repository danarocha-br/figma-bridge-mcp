import {
  FigmaClientConfig,
  FigmaSelection,
  FigmaCodeGenerationOptions,
  FigmaGetCodeResponse,
  FigmaGetVariableDefsResponse,
  FigmaGetCodeConnectMapResponse,
  FigmaGetImageResponse,
  FigmaClientError,
  FigmaServerUnavailableError,
  FigmaAuthenticationError,
  DEFAULT_FIGMA_CLIENT_CONFIG,
} from '../types/figma.js';

interface MCPRequest {
  jsonrpc: '2.0';
  method: string;
  params: {
    name: string;
    arguments?: Record<string, any>;
  };
  id: number | string;
}

interface MCPResponse {
  jsonrpc: '2.0';
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
  id: number | string;
}

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

export class FigmaClient {
  private config: FigmaClientConfig;
  private cache = new Map<string, CacheEntry>();
  private requestId = 0;

  constructor(config?: Partial<FigmaClientConfig>) {
    this.config = { ...DEFAULT_FIGMA_CLIENT_CONFIG, ...config };
  }

  /**
   * Test connection to Figma MCP server
   *
   * NOTE: The Figma MCP server is working correctly. It uses:
   * 1. SSE to establish session endpoints
   * 2. HTTP 202 "Accepted" responses for async request processing
   * 3. Responses come back through the SSE stream (bidirectional)
   *
   * Current implementation successfully connects but needs full SSE listener
   * for proper response handling. For now, HTTP 202 = successful connection.
   */
  async testConnection(): Promise<boolean> {
    try {
      // First establish SSE connection to get session endpoint
      const sessionEndpoint = await this.establishSSEConnection();
      if (!sessionEndpoint) return false;

      // Test the session endpoint - HTTP 202 means connection works
      await this.makeSessionRequest(sessionEndpoint, 'tools/list', {});
      // Any response (including HTTP 202 mock) means Figma MCP is available
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Retrieves the generated code for a given Figma selection.
   *
   * This function utilizes the Figma MCP server to generate code based on the
   * provided selection and options. It supports caching to optimize performance.
   * If caching is enabled and a cached result is available, it is returned directly.
   * Otherwise, a request is made to the Figma MCP server to generate the code.
   *
   * @param selection - The Figma selection for which to generate code, including
   *                    the URL and optional node ID.
   * @param options - Optional code generation options such as framework, styling,
   *                  and TypeScript preference.
   * @returns A promise that resolves to the generated code response, including
   *          the code, framework, styling, components, variables, and assets.
   * @throws FigmaClientError if the code generation request fails.
   */

  async getCode(
    selection: FigmaSelection,
    options?: FigmaCodeGenerationOptions
  ): Promise<FigmaGetCodeResponse> {
    const cacheKey = `getCode:${JSON.stringify(selection)}:${JSON.stringify(options)}`;

    if (this.config.cacheEnabled) {
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;
    }

    try {
      const response = await this.makeRequest('tools/call', {
        name: 'get_code',
        arguments: {
          url: selection.url,
          nodeId: selection.nodeId,
          clientLanguages: 'typescript,javascript',
          clientFrameworks: 'react',
          clientName: 'figma-bridge-mcp',
        },
      });

      if (response.error) {
        throw new FigmaClientError(response.error.message, 'GET_CODE_FAILED', response.error.code);
      }

      const result = this.parseCodeResponse(response.result);

      if (this.config.cacheEnabled) {
        this.setCache(cacheKey, result);
      }

      return result;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Retrieves variable definitions from a Figma file.
   *
   * This function fetches and returns the variable definitions for a given
   * Figma file, optionally scoped to a specific node. If caching is enabled,
   * it will attempt to retrieve the data from the cache before making a request
   * to the Figma MCP server.
   *
   * @param fileUrl - The URL of the Figma file.
   * @param nodeId - Optional ID of the node to scope the variable definitions.
   * @returns A promise that resolves to the variable definitions response.
   * @throws FigmaClientError if the request to the Figma MCP server fails.
   */

  async getVariableDefinitions(
    fileUrl: string,
    nodeId?: string
  ): Promise<FigmaGetVariableDefsResponse> {
    const cacheKey = `getVariables:${fileUrl}:${nodeId}`;

    if (this.config.cacheEnabled) {
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;
    }

    try {
      const args: any = {
        clientLanguages: 'typescript,javascript',
        clientFrameworks: 'react',
        clientName: 'figma-bridge-mcp',
      };

      // Add nodeId if provided, otherwise try to extract from URL
      if (nodeId) {
        args.nodeId = nodeId;
      } else {
        const parsed = FigmaClient.parseFigmaUrl(fileUrl);
        if (parsed.nodeId) {
          args.nodeId = parsed.nodeId;
        }
      }

      const response = await this.makeRequest('tools/call', {
        name: 'get_variable_defs',
        arguments: args,
      });

      if (response.error) {
        throw new FigmaClientError(
          response.error.message,
          'GET_VARIABLES_FAILED',
          response.error.code
        );
      }

      const result = this.parseVariablesResponse(response.result);

      if (this.config.cacheEnabled) {
        this.setCache(cacheKey, result);
      }

      return result;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Requests the code component mapping from the Figma MCP server.
   *
   * @param fileUrl - The URL of the Figma file.
   * @param nodeId - Optional ID of the node to scope the code component mapping.
   * @returns A promise that resolves to the code component mapping response.
   * @throws FigmaClientError if the request to the Figma MCP server fails.
   */
  async getCodeConnectMap(
    fileUrl: string,
    nodeId?: string
  ): Promise<FigmaGetCodeConnectMapResponse> {
    const cacheKey = `getCodeConnect:${fileUrl}:${nodeId}`;

    if (this.config.cacheEnabled) {
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;
    }

    try {
      const args: any = {
        clientLanguages: 'typescript,javascript',
        clientFrameworks: 'react',
        clientName: 'figma-bridge-mcp',
      };

      // Add nodeId if provided, otherwise try to extract from URL
      if (nodeId) {
        args.nodeId = nodeId;
      } else {
        const parsed = FigmaClient.parseFigmaUrl(fileUrl);
        if (parsed.nodeId) {
          args.nodeId = parsed.nodeId;
        }
      }

      const response = await this.makeRequest('tools/call', {
        name: 'get_code_connect_map',
        arguments: args,
      });

      if (response.error) {
        throw new FigmaClientError(
          response.error.message,
          'GET_CODE_CONNECT_FAILED',
          response.error.code
        );
      }

      const result = this.parseCodeConnectResponse(response.result);

      if (this.config.cacheEnabled) {
        this.setCache(cacheKey, result);
      }

      return result;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Requests an image from the Figma MCP server.
   *
   * @param selection - The selection object containing the Figma file URL and node ID.
   * @param options - Optional parameters:
   *   - format: The image format (png, jpg, or svg).
   *   - scale: The image scale (1 is the default).
   * @returns A promise that resolves to the image response.
   * @throws FigmaClientError if the request to the Figma MCP server fails.
   */
  async getImage(
    selection: FigmaSelection,
    options?: { format?: 'png' | 'jpg' | 'svg'; scale?: number }
  ): Promise<FigmaGetImageResponse> {
    try {
      const response = await this.makeRequest('tools/call', {
        name: 'get_image',
        arguments: {
          url: selection.url,
          nodeId: selection.nodeId,
          ...options,
        },
      });

      if (response.error) {
        throw new FigmaClientError(response.error.message, 'GET_IMAGE_FAILED', response.error.code);
      }

      return this.parseImageResponse(response.result);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Parses a Figma URL and extracts the file ID and optionally the node ID.
   *
   * @param url - The Figma URL to parse.
   * @returns An object containing the file ID and optionally the node ID.
   * @throws FigmaClientError if the URL is invalid.
   */
  static parseFigmaUrl(url: string): { fileId: string; nodeId?: string } {
    const urlPattern = /figma\.com\/(?:file|design)\/([a-zA-Z0-9]+)/;
    const match = url.match(urlPattern);

    if (!match) {
      throw new FigmaClientError('Invalid Figma URL format', 'INVALID_URL');
    }

    // Extract node-id from query parameters
    const nodeIdMatch = url.match(/[?&]node-id=([^&]+)/);
    const nodeId = nodeIdMatch ? nodeIdMatch[1].replace(/%3A/g, ':') : undefined;

    const result: { fileId: string; nodeId?: string } = {
      fileId: match[1],
    };

    if (nodeId) {
      result.nodeId = nodeId;
    }

    return result;
  }

  /**
   * Clears the entire cache.
   *
   * This method removes all entries from the cache, effectively resetting it.
   * It does not affect any other stored data or configurations.
   */

  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Retrieves statistics about the cache.
   *
   * Returns an object containing two properties:
   *   - `size`: The number of items currently stored in the cache.
   *   - `hitRate`: The percentage of cache hits (0-100). This is currently
   *     always 0, as the cache implementation does not track hits/misses.
   * @returns {Object} Cache statistics.
   */

  getCacheStats(): { size: number; hitRate: number } {
    // Simple implementation - could be enhanced with proper metrics
    return {
      size: this.cache.size,
      hitRate: 0, // Would need to track hits/misses for real implementation
    };
  }

  // Private methods

  /**
   * Establishes a connection to the Figma MCP server using Server-Sent Events.
   *
   * This method returns a promise that resolves to the session endpoint URL
   * if the connection is successful, or `null` if an error occurs.
   *
   * The method first sends a GET request to the Figma MCP server to establish
   * the SSE connection. Then it reads the response body as a stream of text
   * events. It extracts the session endpoint URL from the first event with
   * `event: endpoint`, and returns it.
   *
   * If an error occurs during the request or while reading the response,
   * the method logs the error to the console and returns `null`.
   *
   * @returns {Promise<string | null>} The session endpoint URL if the connection
   *   is successful, or `null` if an error occurs.
   */
  private async establishSSEConnection(): Promise<string | null> {
    try {
      const response = await fetch(`${this.config.serverUrl}/sse`, {
        method: 'GET',
        headers: {
          Accept: 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
        signal: AbortSignal.timeout(this.config.timeout),
      });

      if (!response.ok) {
        throw new Error(`SSE connection failed: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let sessionEndpoint: string | null = null;

      try {
        const { value, done } = await reader.read();
        if (done) throw new Error('SSE stream ended prematurely');

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('event: endpoint')) {
            // Next line should be the data
            const dataLineIndex = lines.indexOf(line) + 1;
            if (dataLineIndex < lines.length) {
              const dataLine = lines[dataLineIndex];
              if (dataLine.startsWith('data: ')) {
                sessionEndpoint = dataLine.substring(6);
                break;
              }
            }
          }
        }

        reader.cancel();
        return sessionEndpoint;
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      console.error('SSE connection error:', error);
      return null;
    }
  }

  /**
   * Makes a request to the Figma MCP server using the session endpoint.
   *
   * This method takes the endpoint URL, request method, and request parameters,
   * and sends a POST request to the Figma MCP server. It then parses the response
   * as JSON and returns it as an `MCPResponse` object.
   *
   * If the request is successful, the method returns a valid `MCPResponse` object.
   * If the request fails, it throws an error of type `FigmaClientError`.
   *
   * This method is currently used for testing the connection to the Figma MCP server.
   * @param {string} endpoint The session endpoint URL.
   * @param {string} method The request method.
   * @param {Object} params The request parameters.
   * @returns {Promise<MCPResponse>} The response as an `MCPResponse` object.
   */
  private async makeSessionRequest(
    endpoint: string,
    method: string,
    params: any
  ): Promise<MCPResponse> {
    const request: MCPRequest = {
      jsonrpc: '2.0',
      method,
      params,
      id: ++this.requestId,
    };

    const fullUrl = `${this.config.serverUrl}${endpoint}`;

    try {
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(this.config.timeout),
      });

      if (!response.ok) {
        if (response.status === 503) {
          throw new FigmaServerUnavailableError();
        }
        if (response.status === 401) {
          throw new FigmaAuthenticationError();
        }
        throw new FigmaClientError(
          `HTTP ${response.status}: ${response.statusText}`,
          'HTTP_ERROR',
          response.status
        );
      }

      const responseText = await response.text();

      // Handle HTTP 202 Accepted - Figma MCP server uses async processing
      if (response.status === 202 && responseText === 'Accepted') {
        // For now, return a basic success response for connection testing
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: { tools: [{ name: 'figma_connected' }] },
        } as MCPResponse;
      }

      try {
        const data = JSON.parse(responseText);
        return data as MCPResponse;
      } catch (e) {
        throw new FigmaClientError(`Invalid JSON response: ${responseText}`, 'INVALID_RESPONSE');
      }
    } catch (error) {
      if (error instanceof FigmaClientError) {
        throw error;
      }

      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new FigmaServerUnavailableError();
      }

      throw new FigmaClientError(
        `Session request failed: ${error instanceof Error ? error.message : String(error)}`,
        'SESSION_REQUEST_FAILED'
      );
    }
  }

  /**
   * Sends a request to Figma MCP server with retry logic and SSE connection management.
   * Retries up to {@link FigmaClientConfig.retryAttempts} times if the request fails
   * due to SSE connection conflicts, with an exponential backoff delay between retries.
   * @param method The method name to call on the Figma MCP server.
   * @param params The request parameters to send to the server.
   * @returns A promise that resolves with the response from the server.
   * @throws FigmaClientError if the request fails or the server is unavailable.
   */
  async makeRequest(method: string, params: any): Promise<MCPResponse> {
    // Implement retry logic for SSE connection conflicts
    let lastError: Error;

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        return await this.makeRequestWithSSE(method, params);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < this.config.retryAttempts) {
          // Add exponential backoff delay between retries
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          console.error(
            `🔄 Request attempt ${attempt} failed, retrying in ${delay}ms: ${lastError.message}`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError!;
  }

  /**
   * Sends a request to Figma MCP server with retry logic and SSE connection management.
   * @param method The method name to call on the Figma MCP server.
   * @param params The request parameters to send to the server.
   * @returns A promise that resolves with the response from the server.
   * @throws FigmaClientError if the request fails or the server is unavailable.
   */
  private async makeRequestWithSSE(method: string, params: any): Promise<MCPResponse> {
    const request: MCPRequest = {
      jsonrpc: '2.0',
      method,
      params,
      id: ++this.requestId,
    };

    try {
      // Step 1: Establish SSE connection
      const response = await fetch(`${this.config.serverUrl}/sse`, {
        method: 'GET',
        headers: {
          Accept: 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
        signal: AbortSignal.timeout(this.config.timeout),
      });

      if (!response.ok) {
        throw new FigmaServerUnavailableError();
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let sessionEndpoint: string | null = null;

      // Step 2: Get session endpoint
      const { value, done } = await reader.read();
      if (done) throw new Error('SSE stream ended prematurely');

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('event: endpoint')) {
          const dataLineIndex = lines.indexOf(line) + 1;
          if (dataLineIndex < lines.length) {
            const dataLine = lines[dataLineIndex];
            if (dataLine.startsWith('data: ')) {
              sessionEndpoint = dataLine.substring(6);
              break;
            }
          }
        }
      }

      if (!sessionEndpoint) {
        reader.cancel();
        throw new Error('No session endpoint found');
      }

      // Step 3: Send request to session endpoint
      const sessionUrl = `${this.config.serverUrl}${sessionEndpoint}`;
      const sessionResponse = await fetch(sessionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(this.config.timeout),
      });

      // HTTP 202 Accepted is expected - response comes via SSE
      if (sessionResponse.status !== 202) {
        reader.cancel();
        throw new FigmaClientError(
          `Unexpected session response: ${sessionResponse.status}`,
          'UNEXPECTED_RESPONSE',
          sessionResponse.status
        );
      }

      // Step 4: Listen for response via SSE
      const responsePromise = new Promise<MCPResponse>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reader.cancel();
          reject(new FigmaClientError('Response timeout', 'TIMEOUT'));
        }, this.config.timeout);

        const listenForResponse = async () => {
          try {
            let buffer = '';
            while (true) {
              const { value, done } = await reader.read();
              if (done) {
                clearTimeout(timeout);
                reject(new FigmaClientError('SSE stream ended without response', 'STREAM_ENDED'));
                break;
              }

              const chunk = decoder.decode(value);
              if (!chunk) continue;

              buffer += chunk;
              const lines = buffer.split('\n');

              // Keep last incomplete line in buffer
              buffer = lines[lines.length - 1];

              for (let i = 0; i < lines.length - 1; i++) {
                const line = lines[i].trim();

                if (line.startsWith('event: message')) {
                  // Look for the data line that follows
                  i++;
                  while (i < lines.length - 1 && !lines[i].trim()) {
                    i++; // Skip empty lines
                  }

                  if (i < lines.length - 1 && lines[i].startsWith('data: ')) {
                    try {
                      const dataLine = lines[i].substring(6);
                      const responseData = JSON.parse(dataLine);

                      // Accept any response with result or error - Figma MCP may use different IDs
                      if (responseData.result || responseData.error) {
                        clearTimeout(timeout);
                        reader.cancel();

                        // Override the ID to match our request
                        responseData.id = request.id;
                        resolve(responseData as MCPResponse);
                        return;
                      }
                    } catch (e) {
                      // Continue if JSON parse fails
                    }
                  }
                }
              }
            }
          } catch (error) {
            clearTimeout(timeout);
            reader.cancel();
            reject(error);
          }
        };

        listenForResponse();
      });

      return await responsePromise;
    } catch (error) {
      if (error instanceof FigmaClientError) {
        throw error;
      }

      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new FigmaServerUnavailableError();
      }

      throw new FigmaClientError(
        `Request failed: ${error instanceof Error ? error.message : String(error)}`,
        'REQUEST_FAILED'
      );
    }
  }

  /**
   * Parse the MCP response into our expected format
   *
   * @param result - The MCP response
   * @returns The parsed response
   */
  private parseCodeResponse(result: any): FigmaGetCodeResponse {
    // Parse the MCP response into our expected format
    if (result?.content) {
      // Extract code from the first content item
      const codeContent = result.content.find(
        (item: any) =>
          item.type === 'text' && (item.text.includes('export') || item.text.includes('function'))
      );

      // Extract variables from content
      const variablesContent = result.content.find(
        (item: any) => item.type === 'text' && item.text.includes('variables are contained')
      );

      return {
        code: codeContent?.text || '',
        framework: 'react',
        styling: 'tailwind',
        components: this.parseComponentsFromCode(codeContent?.text || ''),
        variables: variablesContent ? this.parseVariablesFromText(variablesContent.text) : [],
        assets: result.assets,
      };
    }

    const code = result.content?.[0]?.text || result.code || '';
    return {
      code,
      framework: result.framework || 'react',
      styling: result.styling || 'tailwind',
      components: result.components || this.parseComponentsFromCode(code),
      variables: result.variables || [],
      assets: result.assets,
    };
  }

  /**
   * Parse variables from a text description into an array of objects.
   *
   * The text is expected to contain lines with the format "name: value", where
   * "value" is a string that can be converted to a color, typography, or string
   * variable.
   *
   * @param text The text description to parse
   * @returns An array of objects with the following properties:
   *  - id: The variable name
   *  - name: The variable name
   *  - value: The variable value
   *  - type: The type of variable (color, typography, or string)
   */
  private parseVariablesFromText(text: string): any[] {
    // Extract variables from the text description
    const variableMatches = text.matchAll(/([^:,]+):\s*([^,]+)/g);
    const variables = [];

    for (const match of variableMatches) {
      const [_, name, value] = match;
      if (name && value) {
        variables.push({
          id: name.trim(),
          name: name.trim(),
          value: value.trim(),
          type: value.includes('#') ? 'color' : value.includes('Font(') ? 'typography' : 'string',
        });
      }
    }

    return variables;
  }

  /**
   * Parse React component information from code string, focusing on layout analysis
   * for complex frames containing multiple UI elements and components.
   *
   * @param code Code string to parse
   * @returns Array of parsed component information with layout analysis
   */
  private parseComponentsFromCode(code: string): any[] {
    const components: any[] = [];

    if (!code) return components;

    // Extract main component/frame info
    const functionMatch = code.match(/export\s+default\s+function\s+(\w+)/);
    if (functionMatch) {
      const frameName = functionMatch[1];

      // Extract all data-name attributes to find component instances
      const dataNameMatches = code.matchAll(/data-name="([^"]+)"/g);
      const allElements = Array.from(dataNameMatches)
        .map((match) => match[1])
        .filter((name) => name && !name.startsWith('.') && !name.startsWith('💠'));

      // Analyze layout structure from className patterns
      const layoutInfo = this.analyzeLayoutStructure(code);

      // Identify potential UI components from data-names and classNames
      const uiComponents = this.identifyUIComponents(allElements, code);

      // Main frame/layout component
      components.push({
        id: frameName.toLowerCase(),
        name: frameName,
        type: 'layout',
        description: `Layout frame containing ${uiComponents.length} UI elements`,
        elements: allElements.slice(0, 20), // Limit for readability
        uiComponents: uiComponents,
        layout: layoutInfo,
        properties: {
          framework: 'react',
          styling: 'tailwind',
          elementCount: allElements.length,
          hasFlexLayout: code.includes('flex'),
          hasGridLayout: code.includes('grid'),
          hasAbsolutePositioning: code.includes('absolute'),
        },
      });
    }

    return components;
  }

  /**
   * Analyze the given code string to extract information about its layout structure,
   * such as the number of flex and grid containers, absolute positioned elements,
   * and common spacing and positioning patterns.
   *
   * @param code Code string to analyze
   * @returns Object with extracted layout structure information
   */
  private analyzeLayoutStructure(code: string): any {
    return {
      flexContainers: (code.match(/flex/g) || []).length,
      gridContainers: (code.match(/grid/g) || []).length,
      absoluteElements: (code.match(/absolute/g) || []).length,
      spacing: this.extractSpacingPatterns(code),
      positioning: this.extractPositioningPatterns(code),
    };
  }

  /**
   * Identify potential UI components from a list of data-name attributes and code string.
   *
   * This function takes a list of data-name attributes and a code string, and returns an array of
   * objects with the following properties:
   *   - name: The name of the component (e.g. Button, Input, Card, etc.)
   *   - type: The type of component (e.g. button, input, card, etc.)
   *   - context: An object with information about the component's context in the code, such as
   *     - parents: An array of parent elements
   *     - children: An array of child elements
   *     - classes: An array of CSS classes applied to the element
   *     - styles: An object with CSS styles applied to the element
   *
   * The function uses a simple keyword-based approach to identify potential UI components. If a
   * data-name attribute contains any of the keywords in the `componentKeywords` array, the element
   * is considered a potential UI component.
   *
   * @param elements An array of data-name attributes
   * @param code A code string
   * @returns An array of objects with component information
   */
  private identifyUIComponents(elements: string[], code: string): any[] {
    const componentKeywords = [
      'Button',
      'Input',
      'Card',
      'Modal',
      'Header',
      'Footer',
      'Navigation',
      'Menu',
      'Form',
      'Table',
      'List',
    ];

    return elements
      .filter((element) =>
        componentKeywords.some((keyword) => element.toLowerCase().includes(keyword.toLowerCase()))
      )
      .map((element) => ({
        name: element,
        type: this.inferComponentType(element),
        context: this.extractElementContext(element, code),
      }))
      .slice(0, 10); // Limit for readability
  }

  /**
   * Infers the component type based on the element's name.
   *
   * This function matches keywords from the element's name to categorize it
   * into predefined component types such as 'button', 'input', 'card',
   * 'navigation', 'form', 'data-display', or a generic 'element' if no
   * specific type is matched.
   *
   * @param elementName The name of the element to infer its type from.
   * @returns A string representing the inferred component type.
   */

  private inferComponentType(elementName: string): string {
    const name = elementName.toLowerCase();
    if (name.includes('button')) return 'button';
    if (name.includes('input') || name.includes('field')) return 'input';
    if (name.includes('card')) return 'card';
    if (name.includes('header') || name.includes('nav')) return 'navigation';
    if (name.includes('form')) return 'form';
    if (name.includes('table') || name.includes('list')) return 'data-display';
    return 'element';
  }

  /**
   * Finds the given element in the code and extracts the first 5 styling classes
   * from its className attribute, if present. The extracted classes are returned
   * as an array of strings in the `styling` property. The `hasClassName` property
   * is set to true if the element has a className attribute.
   *
   * @param elementName The name of the element to search for.
   * @param code The code string to search in.
   * @returns An object with `hasClassName` and `styling` properties.
   */
  private extractElementContext(elementName: string, code: string): any {
    // Find the element in code and extract nearby className for context
    const regex = new RegExp(`data-name="${elementName}"[^>]*className="([^"]*)"`, 'i');
    const match = code.match(regex);

    return {
      hasClassName: !!match,
      styling: match ? match[1].split(' ').slice(0, 5) : [], // First 5 classes
    };
  }

  /**
   * Extracts spacing patterns from the given code string.
   *
   * Scans the code for occurrences of spacing-related class names like
   * `p-2`, `m-4`, `gap-x-6`. The matching classes are deduplicated and
   * the first 10 of them are returned as an array of strings in the
   * `patterns` property. Additionally, the total count of spacing classes
   * is returned in the `count` property, and boolean flags are set to
   * indicate the presence of padding (`hasPadding`), margin (`hasMargin`), or
   * gap (`hasGaps`) classes.
   *
   * @param code The code string to search for spacing classes in.
   * @returns An object with `patterns`, `count`, `hasPadding`, `hasMargin`, and
   * `hasGaps` properties.
   */
  private extractSpacingPatterns(code: string): any {
    const spacingClasses = code.match(/\b(p|m|gap)-\w+/g) || [];
    const uniqueSpacing = [...new Set(spacingClasses)].slice(0, 10);

    return {
      patterns: uniqueSpacing,
      count: spacingClasses.length,
      hasPadding: spacingClasses.some((c) => c.startsWith('p-')),
      hasMargin: spacingClasses.some((c) => c.startsWith('m-')),
      hasGaps: spacingClasses.some((c) => c.startsWith('gap-')),
    };
  }

  /**
   * Extracts positioning patterns from the given code string.
   *
   * Scans the code for occurrences of positioning-related class names like
   * `top-1`, `left-2`, `right-3`, `bottom-4`. The matching classes are deduplicated
   * and the first 10 of them are returned as an array of strings in the `patterns`
   * property. Additionally, the total count of positioning classes is returned in
   * the `count` property, and boolean flags are set to indicate the presence of
   * relative (`hasRelative`), absolute (`hasAbsolute`), or fixed (`hasFixed`)
   * positioning classes.
   *
   * @param code The code string to search for positioning classes in.
   * @returns An object with `patterns`, `count`, `hasRelative`, `hasAbsolute`, and
   * `hasFixed` properties.
   */
  private extractPositioningPatterns(code: string): any {
    const positionClasses = code.match(/\b(top|left|right|bottom)-\w+/g) || [];
    const uniquePositions = [...new Set(positionClasses)].slice(0, 10);

    return {
      patterns: uniquePositions,
      count: positionClasses.length,
      hasRelative: code.includes('relative'),
      hasAbsolute: code.includes('absolute'),
      hasFixed: code.includes('fixed'),
    };
  }

  /**
   * Parses the variable definitions response from the Figma MCP server.
   *
   * @param result - The response object from the Figma MCP server, which may contain
   *                 variable definitions in a JSON string format.
   * @returns A `FigmaGetVariableDefsResponse` object that includes parsed variables and collections.
   *          If the response indicates that nothing is selected or if parsing fails,
   *          returns an object with empty `variables` and `collections` arrays.
   */

  private parseVariablesResponse(result: any): FigmaGetVariableDefsResponse {
    // Handle the response format from Figma MCP server
    if (result?.content?.[0]?.text) {
      const text = result.content[0].text;

      // Handle common Figma MCP responses
      if (text === 'Nothing is selected' || text.includes('Nothing is selected')) {
        // This is expected when no design tokens are available in the file/selection
        return {
          variables: [],
          collections: [],
        };
      }

      try {
        // The response contains variables as a JSON string in content[0].text
        const variablesData = JSON.parse(text);

        // Convert the key-value pairs to our expected format
        const variables = Object.entries(variablesData).map(([name, value]) => ({
          id: name,
          name,
          type:
            typeof value === 'string' && value.startsWith('#')
              ? ('color' as const)
              : typeof value === 'number' || !isNaN(Number(value))
                ? ('float' as const)
                : typeof value === 'boolean'
                  ? ('boolean' as const)
                  : ('string' as const),
          value,
          category: name.split('/')[0], // Extract category from name
        }));

        return {
          variables,
          collections: [],
        };
      } catch (e) {
        // If parsing fails, return empty but don't error
        return {
          variables: [],
          collections: [],
        };
      }
    }

    return {
      variables: result.variables || [],
      collections: result.collections || [],
    };
  }

  /**
   * Handles the response format from Figma MCP server for `get_code_connect_map` requests.
   * @param result - The response from the Figma MCP server
   * @returns The parsed code component mapping data
   */
  private parseCodeConnectResponse(result: any): FigmaGetCodeConnectMapResponse {
    return {
      mappings: result.mappings || [],
      coverage: result.coverage || 0,
      unmappedComponents: result.unmappedComponents || [],
    };
  }

  /**
   * Handles the response format from Figma MCP server for `get_image` requests.
   * @param result - The response from the Figma MCP server
   * @returns The parsed image data
   */
  private parseImageResponse(result: any): FigmaGetImageResponse {
    return {
      url: result.url || result.content?.[0]?.text || '',
      format: result.format || 'png',
      scale: result.scale || 1,
    };
  }

  /**
   * Retrieves data from the cache if it exists and is not expired.
   * @param key - The unique key for the cached data
   * @returns The cached data if it exists and is not expired, otherwise null
   */
  private getFromCache(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Stores data in the cache under the given key.
   * @param key - The unique key for the cached data
   * @param data - The data to store
   */
  private setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: this.config.cacheTTL,
    });
  }

  /**
   * Handles errors by checking if the error is an instance of FigmaClientError.
   * If it is, the error is returned as is. Otherwise, a new FigmaClientError
   * is created with the error message and an 'UNKNOWN_ERROR' code.
   *
   * @param error - The error to handle, which can be of any type.
   * @returns An instance of FigmaClientError representing the handled error.
   */

  private handleError(error: any): FigmaClientError {
    if (error instanceof FigmaClientError) {
      return error;
    }

    return new FigmaClientError(
      `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
      'UNKNOWN_ERROR'
    );
  }
}
