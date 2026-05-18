export interface Result<T> {
  data: T;
  code: 0 | 1;
  msg: string;
}