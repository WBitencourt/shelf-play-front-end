import { Tooltip } from "@/components/Tooltip2.0";
import { formatDistanceToNow, formatDistanceToNowStrict } from "date-fns";
import { ptBR } from "date-fns/locale";
import moment from "moment";
import { TriangleAlert, Clock } from "lucide-react";

interface IconAlertTableProps {
  date: string;
}

export const IconAlertTable = ({ date }: IconAlertTableProps) => {
  date = moment(date, 'DD/MM/YYYY HH:mm').toISOString();

  if(!date) {
    return null;
  }

  const dateTimeNow = moment();

  const title = formatDistanceToNow(new Date(date), { 
    locale: ptBR, 
    addSuffix: true,
  }) 

  const titleWithoutSuffix = formatDistanceToNowStrict(new Date(date), { 
    locale: ptBR, 
  }) 

  const isOutDate = moment(date).isBefore(dateTimeNow);
  const isThreeHourLeftToOutDate = moment(date).subtract(3, 'hours').isBefore(dateTimeNow);

  if(isOutDate) {
    return (
      <Tooltip.Root>
        <Tooltip.Trigger>
          <TriangleAlert
            className="text-red-500 h-5 w-5" 
          />
        </Tooltip.Trigger>
        <Tooltip.Content side='left'>
          Vencido {title}
        </Tooltip.Content>
      </Tooltip.Root>
    )
  }

  if(isThreeHourLeftToOutDate) {
    return (
      <Tooltip.Root>
        <Tooltip.Trigger>
          <Clock
            className="text-orange-500 h-5 w-5" 
          />
        </Tooltip.Trigger>
        <Tooltip.Content side='left'>
          Vence {title}
        </Tooltip.Content>
      </Tooltip.Root>
    )
  }

  return (
    <Tooltip.Root>
      <Tooltip.Trigger>
        <Clock
          className="text-green-500 h-5 w-5" 
        />
      </Tooltip.Trigger>
      <Tooltip.Content side='left'>
        Aproximadamente {titleWithoutSuffix} até o vencimento
      </Tooltip.Content>
    </Tooltip.Root>
  )
}