export interface Product {
  id: string;
  vendorId: string;
  vendorName?: string;
  vendorPhone?: string;
  name: string;
  priceWithDelivery: number;
  quantity: number;
  imagePath?: string;
  createdAt: Date;
  updatedAt?: Date;
}
