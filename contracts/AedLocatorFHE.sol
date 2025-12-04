// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { FHE, euint32, ebool } from "@fhevm/solidity/lib/FHE.sol";
import { SepoliaConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

contract AedLocatorFHE is SepoliaConfig {
    struct EncryptedAedReport {
        uint256 reportId;
        euint32 encryptedLatitude;
        euint32 encryptedLongitude;
        euint32 encryptedStatus; // 0=unknown, 1=operational, 2=needs_maintenance
        euint32 encryptedTimestamp;
        uint256 publicTimestamp;
    }

    struct AedAggregation {
        euint32 encryptedAvgLatitude;
        euint32 encryptedAvgLongitude;
        euint32 encryptedOperationalCount;
        euint32 encryptedTotalCount;
        bool isRevealed;
    }

    struct DecryptedAggregation {
        uint32 avgLatitude;
        uint32 avgLongitude;
        uint32 operationalCount;
        uint32 totalCount;
        bool isRevealed;
    }

    mapping(uint256 => EncryptedAedReport) public aedReports;
    mapping(uint256 => AedAggregation) public areaAggregations;
    mapping(uint256 => DecryptedAggregation) public decryptedAggregations;
    
    uint256 public reportCount;
    uint256 public aggregationCount;
    address public admin;
    
    event ReportSubmitted(uint256 indexed reportId);
    event AggregationRequested(uint256 indexed areaId);
    event AggregationCompleted(uint256 indexed areaId);
    event AggregationRevealed(uint256 indexed areaId);

    constructor() {
        admin = msg.sender;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Admin only");
        _;
    }

    function submitAedReport(
        euint32 latitude,
        euint32 longitude,
        euint32 status
    ) public {
        reportCount++;
        aedReports[reportCount] = EncryptedAedReport({
            reportId: reportCount,
            encryptedLatitude: latitude,
            encryptedLongitude: longitude,
            encryptedStatus: status,
            encryptedTimestamp: FHE.asEuint32(uint32(block.timestamp)),
            publicTimestamp: block.timestamp
        });
        emit ReportSubmitted(reportCount);
    }

    function requestAreaAggregation(
        euint32 minLatitude,
        euint32 maxLatitude,
        euint32 minLongitude,
        euint32 maxLongitude
    ) public onlyAdmin returns (uint256) {
        aggregationCount++;
        uint256 areaId = aggregationCount;
        
        areaAggregations[areaId] = AedAggregation({
            encryptedAvgLatitude: FHE.asEuint32(0),
            encryptedAvgLongitude: FHE.asEuint32(0),
            encryptedOperationalCount: FHE.asEuint32(0),
            encryptedTotalCount: FHE.asEuint32(0),
            isRevealed: false
        });
        
        emit AggregationRequested(areaId);
        return areaId;
    }

    function calculateAggregation(uint256 areaId) public onlyAdmin {
        require(areaId <= aggregationCount, "Invalid area ID");
        require(!areaAggregations[areaId].isRevealed, "Already aggregated");
        
        euint32 totalLat = FHE.asEuint32(0);
        euint32 totalLon = FHE.asEuint32(0);
        euint32 operational = FHE.asEuint32(0);
        euint32 total = FHE.asEuint32(0);
        uint32 validReports = 0;
        
        for (uint256 i = 1; i <= reportCount; i++) {
            EncryptedAedReport storage report = aedReports[i];
            
            ebool inArea = FHE.and(
                FHE.and(
                    FHE.gte(report.encryptedLatitude, FHE.asEuint32(0)), // Simplified bounds check
                    FHE.lte(report.encryptedLongitude, FHE.asEuint32(1000000)) // Simplified bounds check
                ),
                FHE.neq(report.encryptedStatus, FHE.asEuint32(0))
            );
            
            totalLat = FHE.add(totalLat, FHE.select(inArea, report.encryptedLatitude, FHE.asEuint32(0)));
            totalLon = FHE.add(totalLon, FHE.select(inArea, report.encryptedLongitude, FHE.asEuint32(0)));
            operational = FHE.add(operational, FHE.select(
                FHE.eq(report.encryptedStatus, FHE.asEuint32(1)),
                FHE.asEuint32(1),
                FHE.asEuint32(0)
            ));
            total = FHE.add(total, FHE.select(inArea, FHE.asEuint32(1), FHE.asEuint32(0)));
        }
        
        areaAggregations[areaId] = AedAggregation({
            encryptedAvgLatitude: FHE.div(totalLat, total),
            encryptedAvgLongitude: FHE.div(totalLon, total),
            encryptedOperationalCount: operational,
            encryptedTotalCount: total,
            isRevealed: false
        });
        
        emit AggregationCompleted(areaId);
    }

    function requestAggregationDecryption(uint256 areaId) public onlyAdmin {
        require(areaId <= aggregationCount, "Invalid area ID");
        require(!areaAggregations[areaId].isRevealed, "Already revealed");
        
        AedAggregation storage agg = areaAggregations[areaId];
        bytes32[] memory ciphertexts = new bytes32[](4);
        ciphertexts[0] = FHE.toBytes32(agg.encryptedAvgLatitude);
        ciphertexts[1] = FHE.toBytes32(agg.encryptedAvgLongitude);
        ciphertexts[2] = FHE.toBytes32(agg.encryptedOperationalCount);
        ciphertexts[3] = FHE.toBytes32(agg.encryptedTotalCount);
        
        uint256 reqId = FHE.requestDecryption(ciphertexts, this.decryptAggregation.selector);
    }

    function decryptAggregation(
        uint256 requestId,
        bytes memory cleartexts,
        bytes memory proof
    ) public onlyAdmin {
        FHE.checkSignatures(requestId, cleartexts, proof);
        
        uint32[] memory results = abi.decode(cleartexts, (uint32[]));
        uint256 areaId = aggregationCount;
        
        decryptedAggregations[areaId] = DecryptedAggregation({
            avgLatitude: results[0],
            avgLongitude: results[1],
            operationalCount: results[2],
            totalCount: results[3],
            isRevealed: true
        });
        
        areaAggregations[areaId].isRevealed = true;
        emit AggregationRevealed(areaId);
    }

    function verifyReportConsistency(uint256 reportId1, uint256 reportId2) public view returns (ebool) {
        require(reportId1 <= reportCount && reportId2 <= reportCount, "Invalid report ID");
        
        EncryptedAedReport storage r1 = aedReports[reportId1];
        EncryptedAedReport storage r2 = aedReports[reportId2];
        
        ebool locationMatch = FHE.and(
            FHE.eq(r1.encryptedLatitude, r2.encryptedLatitude),
            FHE.eq(r1.encryptedLongitude, r2.encryptedLongitude)
        );
        
        ebool statusMatch = FHE.eq(r1.encryptedStatus, r2.encryptedStatus);
        
        return FHE.and(locationMatch, statusMatch);
    }

    function getReportCount() public view returns (uint256) {
        return reportCount;
    }

    function getAggregationCount() public view returns (uint256) {
        return aggregationCount;
    }

    function getDecryptedAggregation(uint256 areaId) public view returns (
        uint32 avgLatitude,
        uint32 avgLongitude,
        uint32 operationalCount,
        uint32 totalCount,
        bool isRevealed
    ) {
        require(areaId <= aggregationCount, "Invalid area ID");
        DecryptedAggregation storage agg = decryptedAggregations[areaId];
        return (
            agg.avgLatitude,
            agg.avgLongitude,
            agg.operationalCount,
            agg.totalCount,
            agg.isRevealed
        );
    }
}