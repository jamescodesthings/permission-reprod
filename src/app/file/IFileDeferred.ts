export interface IFileDeferred {
  resolve: (arg: any) => void;
  reject: (arg: any) => void;
  method: string;
  message: any;
  id: string;
  timer?: number;
  retries?: number;
}
