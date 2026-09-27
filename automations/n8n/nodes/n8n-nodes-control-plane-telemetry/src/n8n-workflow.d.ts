declare module "n8n-workflow" {
  export interface INodeExecutionData {
    readonly json: Record<string, unknown>;
    readonly pairedItem?: { readonly item: number };
  }

  interface NodeParameter {
    readonly default: boolean | number | string;
    readonly displayName: string;
    readonly name: string;
    readonly options?: readonly {
      readonly name: string;
      readonly value: string;
    }[];
    readonly required?: boolean;
    readonly type: string;
    readonly typeOptions?: {
      readonly minValue?: number;
    };
  }

  export interface INodeTypeDescription {
    readonly defaults: {
      readonly name: string;
    };
    readonly description: string;
    readonly displayName: string;
    readonly group: readonly string[];
    readonly icon: string;
    readonly inputs: readonly string[];
    readonly name: string;
    readonly outputs: readonly string[];
    readonly properties: readonly NodeParameter[];
    readonly version: number;
  }

  export interface INodeType {
    readonly description: INodeTypeDescription;
  }

  export interface IExecuteFunctions {
    getExecutionId(): string;
    getInputData(): INodeExecutionData[];
    getNode(): {
      readonly id: string;
    };
    getNodeParameter(name: string, index: number): unknown;
    readonly helpers: {
      httpRequest(options: {
        readonly body: unknown;
        readonly headers: Readonly<Record<string, string>>;
        readonly json: boolean;
        readonly method: string;
        readonly url: string;
      }): Promise<unknown>;
    };
  }
}
