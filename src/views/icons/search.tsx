/*
 * Copyright (c) 2025 Analog Devices, Inc.
 * Copyright (c) 2025 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */



interface SearchIconProps {
  color?: string,
}


export default function SearchIcon({color = "#9E9EA4"}: SearchIconProps) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M13.9999 14L11.1332 11.1333M12.6666 7.33333C12.6666 10.2789 10.2788 12.6667 7.33325 12.6667C4.38773 12.6667 1.99992 10.2789 1.99992 7.33333C1.99992 4.38781 4.38773 2 7.33325 2C10.2788 2 12.6666 4.38781 12.6666 7.33333Z" stroke={color} stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  );
}
