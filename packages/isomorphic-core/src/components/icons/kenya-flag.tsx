export default function KenyaFlag({
  className,
}: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 900 600"
      className={className}
    >
      <rect width="900" height="600" fill="#fff"/>
      <rect width="900" height="180" fill="#000"/>
      <rect width="900" height="180" y="420" fill="#060"/>
      <rect width="900" height="180" y="210" fill="#b00"/>
      <path d="M450,100 C380,100 380,300 450,300 C520,300 520,100 450,100 z M450,150 C500,150 500,250 450,250 C400,250 400,150 450,150 z" fill="#fff"/>
      <path d="M450,100 C380,100 380,300 450,300 C450,300 450,270 450,250 C400,250 400,150 450,150 z" fill="#000"/>
      <path d="M450,100 C520,100 520,300 450,300 C450,300 450,270 450,250 C500,250 500,150 450,150 z" fill="#b00"/>
      <rect width="30" height="400" x="435" y="100" fill="#000"/>
    </svg>
  );
} 