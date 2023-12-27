import { Label } from '@/lib/pdf-toolkit/templates/report/components/Section/components/Blocks/Block.Label';
import { tw } from '@/lib/pdf-toolkit/theme';
import { AnyChildren } from '@ballerine/ui';
import { View } from '@react-pdf/renderer';

export interface BlockProps {
  children: AnyChildren;
}

export const Block = ({ children }: BlockProps) => {
  return <View style={tw('flex flex-col gap-3')}>{children}</View>;
};

Block.Label = Label;
