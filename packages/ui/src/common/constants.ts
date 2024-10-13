import { SeverityType } from '@ballerine/common';
import { ComponentProps } from 'react';
import { Badge } from '@/components';

type SeverityToClassName = Record<
  Uppercase<SeverityType> | 'DEFAULT',
  ComponentProps<typeof Badge>['className']
>;

export const severityToTextClassName = {
  HIGH: 'text-destructive',
  MEDIUM: 'text-orange-300',
  LOW: 'text-success',
  CRITICAL: 'text-background',
  DEFAULT: 'text-background',
} as const satisfies SeverityToClassName;

export const severityToClassName = {
  HIGH: `bg-destructive/20 ${severityToTextClassName.HIGH}`,
  MEDIUM: `bg-orange-100 ${severityToTextClassName.MEDIUM}`,
  LOW: `bg-success/20 ${severityToTextClassName.LOW}`,
  CRITICAL: `bg-destructive ${severityToTextClassName.CRITICAL}`,
  DEFAULT: `bg-foreground ${severityToTextClassName.DEFAULT}`,
} as const satisfies SeverityToClassName;