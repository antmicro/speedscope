/*
 * Copyright (c) 2025 Analog Devices, Inc.
 * Copyright (c) 2025 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */



interface ChevronDownIconProps {
  color?: string,
  up?: boolean,
}


export default function ChevronDownIcon({color = "#9E9EA4", up}: ChevronDownIconProps) {
  const rot = {
    transformBox: 'fill-box',
    transforOrigin: 'center',
    transform: 'rotate(180deg)',
  }
  return (
    <svg style={up ? rot : {}} width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4.00006 6L8.00006 10L12.0001 6" stroke={color} stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  );
}
