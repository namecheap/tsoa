import { Controller, Get, Route } from '@namecheap/tsoa-runtime';

export const ItemStatus = {
  Draft: 'Draft',
  Active: 'Active',
  Archived: 'Archived',
} as const;
export type ItemStatusValue = (typeof ItemStatus)[keyof typeof ItemStatus];

export const ItemPriority = {
  Low: 'Low',
  High: 'High',
} as const;
export type ItemPriorityValue = (typeof ItemPriority)[keyof typeof ItemPriority];

export const ItemColor = {
  Red: 'Red',
  Green: 'Green',
} as const;
export type ItemColorValue = (typeof ItemColor)[keyof typeof ItemColor];

export interface ConstObjectEnumItem {
  id: string;
  note: string;
  status: ItemStatusValue | null;
  priority?: ItemPriorityValue;
  label: ItemColorValue | ItemPriorityValue | null;
}

/**
 * The aliases are first reached through the synthetic union TypeNodes that Omit/Pick produce,
 * so a wrong referencer there would be cached as the alias schema for the whole spec.
 */
@Route('ConstObjectEnum')
export class ConstObjectEnumController extends Controller {
  @Get('omit')
  public async getOmitted(): Promise<Omit<ConstObjectEnumItem, 'note'>> {
    return {} as Omit<ConstObjectEnumItem, 'note'>;
  }

  @Get('pick')
  public async getPicked(): Promise<Pick<ConstObjectEnumItem, 'id' | 'priority'>> {
    return {} as Pick<ConstObjectEnumItem, 'id' | 'priority'>;
  }
}
