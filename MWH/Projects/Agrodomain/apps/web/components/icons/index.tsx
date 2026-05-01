/**
 * Icon system — wraps Lucide icons with domain-specific agricultural aliases.
 *
 * Usage:
 *   import { CropIcon, WalletIcon } from "@/components/icons";
 *
 * All icons re-export from lucide-react with consistent sizing props.
 * Domain-specific icon sets are in separate files (crop-icons, farm-icons, etc.)
 * and will be built by the downstream lane (RB-018).
 *
 * Convention:
 * - Icons accept `className` for color/size overrides via Tailwind
 * - Default size: 24x24 (size="24")
 * - Use `aria-hidden="true"` on decorative icons
 */

// Re-export commonly used Lucide icons with agricultural aliases
export {
  // Navigation & platform
  LayoutDashboard as DashboardIcon,
  Bell as NotificationIcon,
  Bell as BellIcon,
  Settings as SettingsIcon,
  User as ProfileIcon,
  User as UserIcon,
  Search as SearchIcon,
  Menu as MenuIcon,
  X as CloseIcon,
  ChevronRight as ChevronRightIcon,
  ChevronDown as ChevronDownIcon,
  ChevronLeft as ChevronLeftIcon,
  ArrowLeft as BackIcon,
  Home as HomeIcon,
  MoreHorizontal as MoreIcon,
  LogOut as LogOutIcon,

  // Finance
  Wallet as WalletIcon,
  ArrowUpRight as SendIcon,
  ArrowDownLeft as ReceiveIcon,
  Shield as EscrowIcon,
  Shield as ShieldIcon,
  PiggyBank as FundIcon,
  DollarSign as CurrencyIcon,
  TrendingUp as TrendUpIcon,
  TrendingDown as TrendDownIcon,

  // Farm & crops
  Sprout as CropIcon,
  Leaf as LeafIcon,
  TreePine as TreeIcon,
  Tractor as TractorIcon,
  MapPin as FieldIcon,
  Droplets as IrrigationIcon,

  // Weather
  Sun as SunIcon,
  CloudRain as RainIcon,
  CloudLightning as StormIcon,
  Thermometer as TemperatureIcon,
  Wind as WindIcon,

  // Logistics
  Truck as TruckIcon,
  Route as RouteIcon,
  Package as DeliveryIcon,
  Warehouse as WarehouseIcon,
  Scale as ScaleIcon,

  // Marketplace
  Store as MarketIcon,
  ShoppingBag as ShoppingBagIcon,
  ShoppingCart as CartIcon,
  MessageSquare as NegotiationIcon,
  MessageCircle as MessageCircleIcon,
  Star as QualityIcon,
  ListPlus as ListingIcon,
  Filter as FilterIcon,

  // Insurance
  ShieldCheck as InsuranceIcon,
  AlertTriangle as AlertIcon,
  FileCheck as ClaimIcon,

  // Advisory
  Bot as AdvisoryIcon,
  BookOpen as GuideIcon,
  BookOpen as BookIcon,
  BarChart3 as AnalyticsIcon,

  // General
  Plus as PlusIcon,
  Check as CheckIcon,
  AlertCircle as InfoCircleIcon,
  Loader2 as LoaderIcon,
  Upload as UploadIcon,
  Download as DownloadIcon,
  Eye as ViewIcon,
  Pencil as EditIcon,
  Trash2 as DeleteIcon,
  Copy as CopyIcon,
  ExternalLink as ExternalLinkIcon,
  Calendar as CalendarIcon,
  Clock as ClockIcon,
  Image as ImageIcon,
  Camera as CameraIcon,
  Mic as MicIcon,
} from "lucide-react";
