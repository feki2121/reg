import React from "react";
import { PrintFooterProps } from "@/types/print";

const DEFAULT_COMPANY = {
  name: "Respect Environnement Group",
  address: "Résidence Essalem, bloc A au 1er étage, Bureau A.1-1, Ennasr 2 Ariana 2037	XXX",
  phone: "25 535 035",
};

export const PrintFooter: React.FC<PrintFooterProps> = ({
  format,
  companyName = DEFAULT_COMPANY.name,
  companyAddress = DEFAULT_COMPANY.address,
  companyPhone = DEFAULT_COMPANY.phone,
  customMessage,
}) => {
  const isTicket = format === "TICKET";

  return (
    <div className={`footer ${isTicket ? "ticket" : ""}`}>
      {customMessage ? (
        <div>{customMessage}</div>
      ) : (
        <>
          <div>
            {companyName} - {companyAddress} - Tél: {companyPhone}
          </div>
          {!isTicket && (
            <div style={{ marginTop: "10px", fontSize: "8px" }}>
              Document généré automatiquement le{" "}
              {new Date().toLocaleDateString("fr-TN")}
            </div>
          )}
        </>
      )}
    </div>
  );
};
