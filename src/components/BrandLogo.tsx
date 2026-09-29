import Image from "next/image";

interface BrandLogoProps {
  width?: number;
  height?: number;
  className?: string;
  variant?: "logo" | "icon";
}

export function BrandLogo({
  width = 80,
  height = 80,
  className = "",
  variant = "logo",
}: BrandLogoProps) {
  const blackSrc = variant === "logo" 
    ? "/assets/img/brand/nft_logo_vetor_logo_black.svg" 
    : "/assets/img/brand/nft_logo_vetor_icone_black.svg";
  
  const whiteSrc = variant === "logo" 
    ? "/assets/img/brand/nft_logo_vetor_logo_white.svg" 
    : "/assets/img/brand/nft_logo_vetor_icone_white.svg";

  return (
    <div className={`inline-flex items-center justify-center shrink-0 ${className}`}>
      <Image
        src={blackSrc}
        alt="NFT Logistics Logo"
        width={width}
        height={height}
        className="logo-theme-black"
        priority
      />
      <Image
        src={whiteSrc}
        alt="NFT Logistics Logo"
        width={width}
        height={height}
        className="logo-theme-white hidden"
        priority
      />
    </div>
  );
}
