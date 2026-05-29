


function formatDateRange(startStr, endStr) {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];


  const start = new Date(startStr);
  const end = new Date(endStr);


  const startMonth = months[start.getMonth()];
  const endMonth = months[end.getMonth()];
  const startDay = start.getDate();
  const endDay = end.getDate();


  const getOrdinal = (n) => {
    if (n % 10 === 1 && n % 100 !== 11) return n + 'st';
    if (n % 10 === 2 && n % 100 !== 12) return n + 'nd';
    if (n % 10 === 3 && n % 100 !== 13) return n + 'rd';
    return n + 'th';
  };


  const startYear = start.getFullYear();
  const endYear = end.getFullYear();


  if (startMonth === endMonth && startYear === endYear) {

    return `From ${startMonth} ${getOrdinal(startDay)} to ${getOrdinal(endDay)} ${startYear}`;
  } else if (startYear === endYear) {

    return `From ${startMonth} ${getOrdinal(startDay)} to ${endMonth} ${getOrdinal(endDay)} ${startYear}`;
  } else {

    return `From ${startMonth} ${getOrdinal(startDay)} ${startYear} to ${endMonth} ${getOrdinal(endDay)} ${endYear}`;
  }
}







export default formatDateRange
