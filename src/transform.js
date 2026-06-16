function getLiquidCurrentWeek() {
  const now = new Date();
  const jan1 = new Date(now.getFullYear(), 0, 1);
  const daysSinceJan1 = Math.floor((now - jan1) / 86400000);
  return Math.floor((daysSinceJan1 + jan1.getDay()) / 7) + 1;
}

function getToday(utcOffset) {
  const adjustedMs = Date.now() + (utcOffset || 0) * 1000;
  return new Date(adjustedMs).toISOString().slice(0, 10);
}

function formatItems(items) {
  const groups = {};
  for (const item of items) {
    if (!groups[item.item_Type]) groups[item.item_Type] = [];
    groups[item.item_Type].push(item.item_Name.trim());
  }
  return Object.values(groups).map(names => names.join(', ')).join('; ');
}

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function sortByDisplayOrder(blockNames, displayOrder) {
  if (!displayOrder.length) return blockNames;
  return [...blockNames].sort((a, b) => {
    const ai = displayOrder.indexOf(a);
    const bi = displayOrder.indexOf(b);
    return (ai === -1 ? Infinity : ai) - (bi === -1 ? Infinity : bi);
  });
}

function transform(input) {
  const currentWeek = getLiquidCurrentWeek();
  const today = getToday(input.trmnl?.user?.utc_offset);

  const rawDisplayOrder = input.trmnl?.plugin_settings?.custom_fields_values?.mealviewer_blocks_to_display;
  const displayOrder = Array.isArray(rawDisplayOrder)
    ? rawDisplayOrder.map(s => s.trim())
    : typeof rawDisplayOrder === 'string'
      ? rawDisplayOrder.split(',').map(s => s.trim()).filter(Boolean)
      : [];

  const weekDays = (input.menuSchedules || [])
    .filter(day =>
      day.dateInformation?.weekNumber == currentWeek &&
      day.dateInformation?.weekDay >= 2 &&
      day.dateInformation?.weekDay <= 6
    )
    .sort((a, b) => a.dateInformation.weekDay - b.dateInformation.weekDay);

  const blockNames = [];
  for (const day of weekDays) {
    for (const block of day.menuBlocks || []) {
      if (!blockNames.includes(block.blockName)) blockNames.push(block.blockName);
    }
  }

  const dayBlockMap = {};
  for (const day of weekDays) {
    const wd = day.dateInformation.weekDay;
    dayBlockMap[wd] = {};
    for (const block of day.menuBlocks || []) {
      const items = block.cafeteriaLineList?.data?.[0]?.foodItemList?.data || [];
      dayBlockMap[wd][block.blockName] = formatItems(items);
    }
  }

  const orderedBlockNames = sortByDisplayOrder(blockNames, displayOrder);

  const weekDayStates = weekDays.map(day => {
    const wd = day.dateInformation.weekDay;
    const dayBlocks = dayBlockMap[wd] || {};
    const hasMeals = Object.values(dayBlocks).some(hasText);
    return {
      hasMeals,
      statusLabel: hasMeals ? '' : 'No meal today.'
    };
  });

  const mealRows = orderedBlockNames.map(blockName => ({
    blockName,
    days: weekDays.map((day, index) => {
      const wd = day.dateInformation.weekDay;
      return {
        text: dayBlockMap[wd][blockName] || '',
        hasMeals: weekDayStates[index].hasMeals,
        statusLabel: weekDayStates[index].statusLabel
      };
    })
  }));

  const todayDay = weekDays.find(day =>
    (day.dateInformation?.dateFull || '').slice(0, 10) === today
  );

  const todayMeals = todayDay
    ? sortByDisplayOrder(
        (todayDay.menuBlocks || []).map(b => b.blockName),
        displayOrder
      ).map(blockName => ({
        blockName,
        text: dayBlockMap[todayDay.dateInformation.weekDay][blockName] || ''
      }))
    : [];

  return {
    logo_svg: input.logo_svg,
    physicalLocation: { name: input.physicalLocation?.name },
    trmnl: {
      plugin_settings: {
        instance_name: input.trmnl?.plugin_settings?.instance_name
      },
      user: { utc_offset: input.trmnl?.user?.utc_offset }
    },
    weekDays: weekDays.map(day => ({ weekDayName: day.dateInformation.weekDayName, weekDayDate: day.dateInformation.dateFull, dateKey: day.dateInformation.dateKey })),
    mealRows,
    todayMeals,
    todayHasMeals: todayMeals.some(meal => hasText(meal.text)),
    today: todayDay.dateInformation
  };
}
