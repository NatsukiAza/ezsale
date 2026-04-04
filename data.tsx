/** Datos mock y tipos compartidos para EZSale (catálogo, equipo, dashboard). */

export const USER_AVATAR =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBgL68gba-3SHja7x6QqnRjNjwa96VR6VBFsg86oN0gdFEEXAH4aRqn5vcVFzp0ZLxr5lmLiOXIIzCOFozAXBeyLpZ2NkFoj2VboiNQdl8HhY5tAQ-3chcGTdVeX0ErQsZXP6s05HHLQVL3MyrjENpdgqWpDIAmEeerVqwWemHkSlbVpEO2y6XrEwr85jWmX3HOkDfQ4fwy4518rsqbazz976hA58a8J1oPeLYsNc6tVipTdBLXOlz6cA1v-cik1BK8h3rWC31mN9vB";

export const dashboardTotalToday = "$12,450.00";
export const dashboardTrend = "+12.5% from yesterday";

export type TodaySaleItem = {
  title: string;
  meta: string;
  price: string;
  icon: string;
};

export const todaySales: TodaySaleItem[] = [
  { title: "Mesa 12", meta: "14:20 • 3 items", price: "$84.50", icon: "flatware" },
  { title: "Barra Principal", meta: "14:05 • 1 item", price: "$12.00", icon: "local_bar" },
  { title: "Para Llevar #102", meta: "13:50 • 2 items", price: "$45.20", icon: "takeout_dining" },
];

export type WeekBar = {
  day: string;
  h: string;
  val: string;
  active?: boolean;
};

export const weekSalesBars: WeekBar[] = [
  { day: "Mon", h: "40%", val: "$4.2k" },
  { day: "Tue", h: "55%", val: "$5.8k" },
  { day: "Wed", h: "45%", val: "$4.9k" },
  { day: "Thu", h: "90%", val: "$9.4k", active: true },
  { day: "Fri", h: "70%", val: "$7.2k" },
  { day: "Sat", h: "85%", val: "$8.8k" },
  { day: "Sun", h: "60%", val: "$6.1k" },
];

export const newSaleCategories = ["Bebidas", "Comida", "Postres", "Vinos", "Combos"] as const;

export const newSaleSubfilters = ["Bebidas Frias", "Bebidas Calientes"] as const;

export type NewSaleProduct = { name: string; price: string };

export const newSaleProducts: NewSaleProduct[] = [
  { name: "Limonada de Coco", price: "$12.50" },
  { name: "Agua Mineral 500ml", price: "$4.00" },
  { name: "Gaseosa de la Casa", price: "$6.50" },
  { name: "Jugo de Naranja", price: "$8.00" },
  { name: "Cerveza Artesanal", price: "$15.00" },
  { name: "Té Frío Durazno", price: "$7.25" },
];

export type CatalogProduct = {
  id: number;
  name: string;
  cat: string;
  sku: string;
  price: string;
  img: string;
};

export const catalogProducts: CatalogProduct[] = [
  {
    id: 1,
    name: "Ensalada César Premium",
    cat: "Entradas",
    sku: "ECS-001",
    price: "$14.50",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuACUBITzjM1FFQlqfRjqB1e1HzeYg7v1xLvPMvWMtnMQT_hIHBQhWHX8fmDRFdqm7u053Rf2qREWIHMkMwSFRW_8l1H8hYJsEiCORh8JmWgQ94LxUI21JGje7tQLixJpWyC6e6Hjc7f-Z2mHH5SbT_nzmlHPAtgLXdmkfCJ9UsW9i_YruNhPJLBeWjXCWYqDVlJTTnMWkc9cvVhKeyoCMCRwWMZjDKbiR7ZvNepGth96-ySEUXE7hwEWXW9C9AkNqwQ8uoiK8lw5_90",
  },
  {
    id: 2,
    name: "Hamburguesa de la Casa",
    cat: "Platos Fuertes",
    sku: "HBC-042",
    price: "$18.90",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBXT8a2Ypl9zjJ43kHCM2wBrZJrDaiUy4BtuJVuUcCCIFQhGUE-q8TcMwL6FcUXae2YbjKQaDuGIHkkKWNdlOQERfiyyJoeela4GjJmVb5Pxlqcib0njqtyBVlSm6i2GZPXVlZmpqRFe-Oz-OPd8zPp9rD80lDPA5cn3wBlxh1Rzwq4RtTdT8MfB189oYvFt0RcHWNYooZCXHwoaOtXgZjO4II0f3QyG9UGxY3LGdquEcKy_u5MJ-x22F872FLdVIuVqDdyk9R_s-79",
  },
  {
    id: 3,
    name: "Cóctel de Autor N°3",
    cat: "Bebidas",
    sku: "CTK-003",
    price: "$12.00",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuB_uURTWweOrA8d_6ASRXfvLBtJrufAYvmHCblezKdA_q_gxnltJ6udntIqzkut25BZoAfaSvC-cY4Do1S1DKy92e_NRKvM_d3CaKfl3k2ZCaqSPf3FOzcBSNNhT2FV9MTQuWPOd-6pf6to7M101J6UdhhoJqDTAaC7uin-wAaUIw2muMCoAmbXJ-usgkq6p-M5hsndk2s3Gar-1DBI6A3wdLtn6A6Gl3jePeFrzTKjtIciEdVdO6UvriTfsw9ICIHp6mGMN2puM8rr",
  },
  {
    id: 4,
    name: "Volcán de Chocolate",
    cat: "Postres",
    sku: "PST-089",
    price: "$9.50",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBRrUfXbgr8Clbpw2NIT5HRa4S13CwmDSCKskM14mR9ajUaSdvu7eDrrUdSYVrIgTllYDPm5OXKDXtkjRHTqyjDvktnUGO7Xxq80ICmXqyS-HV1iypyuSr3MydLG2MwIu8pFejSejm86fU0S4J916Qt7Pdidr1ZEvi4vbP-Sab-8je6mytrsucGDZGUPrMyzQNCHpG4EE5OnTyFPj8-FggfC3R0vujAoouClW3_ccitnmXTybSXJzdojOVJjBi9BEAoPXJkjG3727Kr",
  },
];

export type PaymentMethodRow = { label: string; value: string; colorClass: string };

export const reportsPaymentMethods: PaymentMethodRow[] = [
  { label: "Efectivo", value: "45%", colorClass: "bg-primary" },
  { label: "Mercado Pago", value: "38%", colorClass: "bg-secondary" },
  { label: "Crédito", value: "12%", colorClass: "bg-tertiary-container" },
  { label: "Otros", value: "5%", colorClass: "bg-outline-variant" },
];

export type ReportSaleRow = {
  ticket: string;
  time: string;
  items: string;
  method: string;
  amount: string;
};

export const reportSalesRows: ReportSaleRow[] = [
  {
    ticket: "Ticket #4920",
    time: "Hoy, 14:20",
    items: "2x Risotto de Hongos, 1x Malbec Reserva",
    method: "Mercado Pago",
    amount: "$42.500",
  },
  {
    ticket: "Ticket #4919",
    time: "Hoy, 13:45",
    items: "1x Hamburguesa Gourmet, 1x Cerveza",
    method: "Efectivo",
    amount: "$18.900",
  },
  {
    ticket: "Ticket #4918",
    time: "Hoy, 13:12",
    items: "4x Menú Ejecutivo, 4x Gaseosa",
    method: "Mercado Pago",
    amount: "$64.000",
  },
];

export type TeamMember = {
  name: string;
  email: string;
  role: "Admin" | "Normal";
  active: boolean;
  img: string;
};

export const teamMembers: TeamMember[] = [
  {
    name: "Ana Martínez",
    email: "ana.martinez@ezsale.com",
    role: "Admin",
    active: true,
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCZhahMt9_PtcVxAwxeRTnzoBNOXjjS2uPatyI-B6lW1kBPJ_elynllfyZVFMrIsCdSTZembaYi_k2xup24wqybY-UltVOpMDhtjiO2LsTvqkga7U-NHnwLPVCbn7tqnme6cpwouz7E2SFiQu8yBSGvps_7HBNvnQVUQcqEFciw_6EGNd7O8DR2cyranbJUxFC4m2SCEDDygOroSXqRK-nubZ1IEDPSvd83ylipZUWVzINmFlALGQRZ35yt0y9vs00i3WwN06zCZngj",
  },
  {
    name: "Roberto Gómez",
    email: "r.gomez@ezsale.com",
    role: "Normal",
    active: false,
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCUrp0xoaMawd6NhzebURWbX0YvrbPG5_vSRf1yVDhY3ozGHts9CbhD42l4i6HHfKoRkD-NGOEZ90UgvbMPz30LFNqZXfrubY58yD5zv1uaH-G6RMNUbx0J7z0W1Hm_zjovMKFFcLdp1HTAflPhhaZw0aCHiMHRW_xMaOWe3xgpZu2iFcSZ9cQHa5bRTwVpWnuSKJtqL03vhre4EFYzBqMMTIhznrVnNylwI42cie5rUo3-XDqkFMsGJ9GjrgnF8Pw36h5dMd6OYNsT",
  },
  {
    name: "Lucía Vera",
    email: "lvera@ezsale.com",
    role: "Normal",
    active: false,
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCC_xPqtFJtobUtYpua_jO8_EvKCgd0ANAQI_5rxQDq4rut5DuLdKkL2SmEeTxuh6WB1D4nbBFU1KZHbLQ2iba2p_zOAbmUvDvkn-ZRYFcLk1cMpZu_nX04arhlV6UkjdJydZwv_7JJNwN3rdTEhm1ygbeOHve1H7gxkvUzRQFnTZqCL-SFlzHTQko8aNcADpO25W38GkCQRHo2MqfdipSwFb407l_9kpUegYEtxrN_KcKSewz15S_Uz7z9FOsvM4ItoZWTmeVATY8C",
  },
  {
    name: "Carlos Juárez",
    email: "cjuarez@ezsale.com",
    role: "Admin",
    active: false,
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuD6kA_mzGrPdZBfGn-sy8ecsFx44Fw-rbQA4DW3oI2phR6QGC1uhd57Rn2J3lrS41VmGBrREjtOTb1UsZQYbWocZrbUVHOYWQtWWQLKsPp8iwBxULFBzcWDIH1W5yUioszrUwwTjk2C_jCbVF_7V9HqeScDVWNKJxMwGfh3x9KMdF8IJ4niuIiqf_Y_u8R-nf38ulKGnWtlyxva_KVIcSp5uato3SAROTMQsGj1UJgTnUO5Z8OkXJDFGTmIpDUZk4Xmq-Cs3RplHIMX",
  },
];
