export function formatDate(dateString: string) {
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  }
  
  export function calculateAmount(units: number, pricePerUnit: number) {
    return (units * pricePerUnit).toLocaleString('en-NG', {
      style: 'currency',
      currency: 'NGN'
    });
  }