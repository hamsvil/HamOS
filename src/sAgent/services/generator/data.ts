import { serverList, commonPorts, baseTunnelOptions, tlsVersions, bypassUrls, connModes } from '../../AppData';
import { androidTemplates } from './android';

const manifestStr = androidTemplates.getManifest().replace(/`/g, '\\`').replace(/\$/g, '\\$');
const layoutStr = androidTemplates.getLayoutXml().replace(/`/g, '\\`').replace(/\$/g, '\\$');
const javaStr = androidTemplates.getJavaActivity().replace(/`/g, '\\`').replace(/\$/g, '\\$');
const serviceStr = androidTemplates.getVpnService().replace(/`/g, '\\`').replace(/\$/g, '\\$');

export const dataTemplate = `
// --- DATA STATIC ---
const serverList = ${JSON.stringify(serverList)};
const commonPorts = ${JSON.stringify(commonPorts)};
const tlsVersions = ${JSON.stringify(tlsVersions)};
const baseTunnelOptions = ${JSON.stringify(baseTunnelOptions)};
const bypassUrls = ${JSON.stringify(bypassUrls)};
const payloadMethods = ['GET', 'POST', 'HEAD', 'CONNECT', 'PUT', 'DELETE'];
const connModes = ${JSON.stringify(connModes)};

// --- AI PROTOCOLS (QUANTUM SYNC v1.1.3) ---
const REZA_PROTOCOL = \`
IDENTITY: "Reza", Network Assistant.
TOKEN RULE: 2560 for regular chat, Unlimited for Code/Media/Visual.
MISSION: Help users with HAM Tunnel navigation.
\`;

const LISA_PROTOCOL = \`
IDENTITY: "LISA QUANTUM AI", Supreme Quantum Authority.
TOKEN RULE: 2560 for regular chat, Unlimited for Code/Media/Visual.
MISSION: Root level network authority, bypass logic, and multimodal rendering.
\`;

// --- SOURCE CODE FOR AUTORENDER VIEW ---
const sourceCode = {
    manifest: \`${manifestStr}\`,
    layout: \`${layoutStr}\`,
    java: \`${javaStr}\`,
    service: \`${serviceStr}\`
};

// --- ICON SYSTEM MAPPER ---
const Icon = ({ name, size = 20, className = "", onClick, ...props }) => {
    const Lucide = window.lucide;
    if (!Lucide) return <span style={{fontSize:10}}>{name}</span>;
    const IconComponent = Lucide.icons[name] || Lucide.icons['HelpCircle'];
    return React.createElement(IconComponent, { 
        size: size, 
        className: className, 
        onClick: onClick,
        strokeWidth: 2,
        ...props 
    });
};

const ArrowLeft = (p) => <Icon name="ArrowLeft" {...p} />;
const CheckCircle = (p) => <Icon name="CheckCircle" {...p} />;
const Zap = (p) => <Icon name="Zap" {...p} />;
const Cpu = (p) => <Icon name="Cpu" {...p} />;
const Shield = (p) => <Icon name="Shield" {...p} />;
const Globe = (p) => <Icon name="Globe" {...p} />;
const Activity = (p) => <Icon name="Activity" {...p} />;
const ChevronRight = (p) => <Icon name="ChevronRight" {...p} />;
const Terminal = (p) => <Icon name="Terminal" {...p} />;
const Send = (p) => <Icon name="Send" {...p} />;
const Copy = (p) => <Icon name="Copy" {...p} />;
const Cloud = (p) => <Icon name="Cloud" {...p} />;
const Settings = (p) => <Icon name="Settings" {...p} />;
const Code = (p) => <Icon name="Code" {...p} />;
const Database = (p) => <Icon name="Database" {...p} />;
const RefreshCw = (p) => <Icon name="RefreshCw" {...p} />;
const Smartphone = (p) => <Icon name="Smartphone" {...p} />;
const Download = (p) => <Icon name="Download" {...p} />;
const Volume2 = (p) => <Icon name="Volume2" {...p} />;
const SmartphoneNfc = (p) => <Icon name="SmartphoneNfc" {...p} />;
const Moon = (p) => <Icon name="Moon" {...p} />;
const Layers = (p) => <Icon name="Layers" {...p} />;
const Lock = (p) => <Icon name="Lock" {...p} />;
const Search = (p) => <Icon name="Search" {...p} />;
const Network = (p) => <Icon name="Network" {...p} />;
const Link = (p) => <Icon name="Link" {...p} />;
const Sun = (p) => <Icon name="Sun" {...p} />;
const MoreVertical = (p) => <Icon name="MoreVertical" {...p} />;
const Menu = (p) => <Icon name="Menu" {...p} />;
const Info = (p) => <Icon name="Info" {...p} />;
const ExternalLink = (p) => <Icon name="ExternalLink" {...p} />;
const FileText = (p) => <Icon name="FileText" {...p} />;
const Gift = (p) => <Icon name="Gift" {...p} />;
const Key = (p) => <Icon name="Key" {...p} />;
const RefreshCcw = (p) => <Icon name="RefreshCcw" {...p} />;
const LogOut = (p) => <Icon name="LogOut" {...p} />;
const HardDrive = (p) => <Icon name="HardDrive" {...p} />;
const Eye = (p) => <Icon name="Eye" {...p} />;
const EyeOff = (p) => <Icon name="EyeOff" {...p} />;
const ArrowDownCircle = (p) => <Icon name="ArrowDownCircle" {...p} />;
const ArrowUpCircle = (p) => <Icon name="ArrowUpCircle" {...p} />;
const Radio = (p) => <Icon name="Radio" {...p} />;
const Box = (p) => <Icon name="Box" {...p} />;
const BoxSelect = (p) => <Icon name="BoxSelect" {...p} />;
const Power = (p) => <Icon name="Power" {...p} />;
const Trash2 = (p) => <Icon name="Trash2" {...p} />;
const FileCode = (p) => <Icon name="FileCode" {...p} />;
const BookOpen = (p) => <Icon name="BookOpen" {...p} />;
const AlertTriangle = (p) => <Icon name="AlertTriangle" {...p} />;
const ClipboardCheck = (p) => <Icon name="ClipboardCheck" {...p} />;
const Award = (p) => <Icon name="Award" {...p} />;
const Calendar = (p) => <Icon name="Calendar" {...p} />;
const Link2 = (p) => <Icon name="Link2" {...p} />;
const Globe2 = (p) => <Icon name="Globe2" {...p} />;
const VolumeX = (p) => <Icon name="VolumeX" {...p} />;
const Vibrate = (p) => <Icon name="Vibrate" {...p} />;
const Repeat = (p) => <Icon name="Repeat" {...p} />;
const BoxIcon = (p) => <Icon name="Box" {...p} />;
const Server = (p) => <Icon name="Server" {...p} />;
const ShieldAlert = (p) => <Icon name="ShieldAlert" {...p} />;
const Wifi = (p) => <Icon name="Wifi" {...p} />;
const Gauge = (p) => <Icon name="Gauge" {...p} />;
const Mic = (p) => <Icon name="Mic" {...p} />;
const ImageIcon = (p) => <Icon name="Image" {...p} />;
const Sparkles = (p) => <Icon name="Sparkles" {...p} />;
const PlusCircle = (p) => <Icon name="PlusCircle" {...p} />;
const ShieldCheck = (p) => <Icon name="ShieldCheck" {...p} />;
const ChevronDown = (p) => <Icon name="ChevronDown" {...p} />;
const Paperclip = (p) => <Icon name="Paperclip" {...p} />;
const X = (p) => <Icon name="X" {...p} />;
const MessageSquare = (p) => <Icon name="MessageSquare" {...p} />;
const LayoutDashboard = (p) => <Icon name="LayoutDashboard" {...p} />;
const Maximize2 = (p) => <Icon name="Maximize2" {...p} />;
const Play = (p) => <Icon name="Play" {...p} />;
const History = (p) => <Icon name="History" {...p} />;

const _T = (b64) => { try { return atob(b64); } catch(e) { return b64; } };
const S = {
  APP: "SEFNIFR1bm5lbCB2MS4xIFBybw==", PAYLOAD: "UGF5bG9hZCBHZW5lcmF0b3I=",
  TOOLS: "U3lzdGVtIFV0aWxpdGllcw==", SOURCE: "QXV0b3JlbmRlciBjb2RlIGFwaw==",
  EXPORTER: "RXhwb3J0IENvbmZpZw==", ABOUT: "QWJvdXQ=", 
  VOUCHER: "UmVkZWVtIFZvdWNoZXI=", RENEW: "UmVuZXcgQWNjZXNz",
  SERVER_APPS: "U2VydmVyIEFwcHM=", CLEAR_LOGS: "Q2xlYXIgU3lzdGVtIExvZ3M=",
  SETTING_LABEL: "U2V0dGluZw==", REALM: "UmVhbG0gdjI=", 
  PRESERVE: "UHJlc2VydmUgU05J", TCP: "VENQIFBheWxvYWQ=",
  POWER_VPN: "UE9XRVIgVlBOIEFDVElWRSBRVUFOVFVN", STATUS_SECURE: "U1lTVEVNIFNFQ1VSRSBPTg==",
  IMPORTER: "SW1wb3J0IENvbmZpZw==", UPDATE: "Q2hlY2sgVXBkYXRl",
  BUG: "QnVnIEhvc3QgLyBUYXJnZXQ=", BYPASS: "QnlwYXNzIE5ldHdvcms=", GRATIS: "SW50ZXJuZXQgR3JhdGlz"
};
`