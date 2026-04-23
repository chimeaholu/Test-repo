/**
 * Agrodomain Icon System
 *
 * Barrel export for all icon categories. Lucide is used for standard icons;
 * custom SVGs are provided for agriculture-specific ones (crops, mobile-money).
 *
 * Every icon accepts: size (number), color (string), className (string).
 */

export type { IconProps } from "./crop-icons";

export {
  MaizeIcon,
  CassavaIcon,
  CocoaIcon,
  YamIcon,
  RiceIcon,
  SoybeanIcon,
  TomatoIcon,
  PepperIcon,
  PlantainIcon,
  GroundnutIcon,
  PalmIcon,
} from "./crop-icons";

export {
  TractorIcon,
  FieldIcon,
  IrrigationIcon,
  SoilIcon,
  HarvestIcon,
  SeedIcon,
  FertilizerIcon,
  GreenhouseIcon,
  SiloIcon,
} from "./farm-icons";

export {
  WalletIcon,
  EscrowIcon,
  FundIcon,
  SendIcon,
  ReceiveIcon,
  MobileMoneyIcon,
  BankIcon,
  CreditIcon,
} from "./finance-icons";

export {
  SunIcon,
  RainIcon,
  StormIcon,
  CloudIcon,
  TemperatureIcon,
  HumidityIcon,
  WindIcon,
  DroughtIcon,
  FloodIcon,
} from "./weather-icons";

export {
  TruckIcon,
  RouteIcon,
  DeliveryIcon,
  WarehouseIcon,
  ScaleIcon,
  LoadingIcon,
} from "./logistics-icons";

export {
  DashboardIcon,
  AnalyticsIcon,
  NotificationIcon,
  SettingsIcon,
  ProfileIcon,
  MarketplaceIcon,
  InsuranceIcon,
  AdvisoryIcon,
} from "./platform-icons";
