function convertDateRange(str, startYear = new Date().getFullYear()) {
  if (!str) return ""

  const months = {
    january: 1, february: 2, march: 3, april: 4,
    may: 5, june: 6, july: 7, august: 8,
    september: 9, october: 10, november: 11, december: 12
  };



  const regex = /From\s+([A-Za-z]+)\s+(\d+)(?:st|nd|rd|th)?(?:\s+(\d+))?\s+to\s+(?:(?:([A-Za-z]+)\s+)?(\d+)(?:st|nd|rd|th)?(?:\s+(\d+))?)/i;
  const match = str.match(regex);
  if (!match) return null;

  const startMonthName = match[1].toLowerCase();
  const startDay = parseInt(match[2], 10);
  const startYearFromStr = match[3] ? parseInt(match[3], 10) : null;

  const endMonthName = match[4] ? match[4].toLowerCase() : startMonthName;
  const endDay = parseInt(match[5], 10);
  const endYearFromStr = match[6] ? parseInt(match[6], 10) : null;

  const startMonth = months[startMonthName];
  const endMonth = months[endMonthName];


  const finalStartYear = startYearFromStr ?? startYear;
  let finalEndYear = endYearFromStr;


  if (finalEndYear === null) {
    finalEndYear = endMonth < startMonth ? finalStartYear + 1 : finalStartYear;
  }

  const pad = n => n.toString().padStart(2, "0");

  return `${finalStartYear}.${pad(startMonth)}.${pad(startDay)} - ${finalEndYear}.${pad(endMonth)}.${pad(endDay)}`;
}


export default convertDateRange