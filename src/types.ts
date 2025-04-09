export type User = {
    id: string;
    email: string;
    role: 'admin' | 'vendor';
    approved?: boolean;
  };
  
  export type Customer = {
    id: string;
    meterNumber: string;
    disco: string;
    verification: {
      isVerified: boolean;
    };
  };
  
  export type Token = {
    id: string;
    value: string;
    meterNumber: string;
    units: number;
    amount: number;
    createdAt: string;
  };


  