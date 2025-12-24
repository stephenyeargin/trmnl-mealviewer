function transform(input) {
  return {
    logo_svg: input.logo_svg,

    physicalLocation: {
      name: input.physicalLocation?.name
    },

    trmnl: {
      plugin_settings: {
        instance_name: input.trmnl?.plugin_settings?.instance_name
      }
    },

    menuSchedules: (input.menuSchedules || []).map(day => ({
      dateInformation: {
        weekNumber: day.dateInformation?.weekNumber,
        weekDay: day.dateInformation?.weekDay,
        weekDayName: day.dateInformation?.weekDayName
      },

      menuBlocks: (day.menuBlocks || []).map(block => ({
        blockName: block.blockName,
        cafeteriaLineList: {
          data: [
            {
              foodItemList: {
                data: (
                  block.cafeteriaLineList?.data?.[0]?.foodItemList?.data || []
                ).map(item => ({
                  item_Type: item.item_Type,
                  item_Name: item.item_Name
                }))
              }
            }
          ]
        }
      }))
    }))
  };
}
